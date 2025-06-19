import warnings
import gc
import sys
import os
import pandas as pd
import numpy as np
from tqdm.auto import tqdm
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from supabase import create_client, Client
from prophet import Prophet
from prophet.diagnostics import cross_validation, performance_metrics
from sklearn.metrics import mean_absolute_percentage_error
import pmdarima as pm
import multiprocessing

warnings.filterwarnings("ignore")

# --- Supabase 접속 정보 및 전역 변수 설정 ---
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://rfgtrniqfimnpvheqkaw.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZ3RybmlxZmltbnB2aGVxa2F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTAwMjE4OCwiZXhwIjoyMDY0NTc4MTg4fQ.XVZPaEqjIjE0OIryXhgbB6ZnOdmkuLl6W9USTsE36EI")

MIN_MONTHS = 12
BASE_FUTURE = 12
CV_PERIOD_D_PROPHET = 180 # 6개월
CV_HORIZON_D_PROPHET = 90 # 3개월
FUTURE_COUNT_STRATEGY = 'mean'
FUTURE_COUNT_WINDOW = 6
ARIMA_TEST_PERIODS = 3
# <<< 테이블명은 소문자, 컬럼명은 대문자 규칙 적용 >>>
FORECAST_TABLE_NAME = "customer_order_forecast"

# --- 데이터베이스 헬퍼 함수 ---
def create_supabase_client():
    try:
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Supabase 클라이언트가 성공적으로 생성되었습니다.")
        return client
    except Exception as e:
        print(f"Supabase 클라이언트 생성 오류: {e}")
        return None

def load_data_from_supabase(client: Client):
    try:
        print("Supabase에서 데이터 로딩 중...")
        # <<< 모든 컬럼명을 대문자로 수정 >>>
        orders_response = client.table('orders').select(
            'CONTACT_ID, ORDER_DATE, AMOUNT, contacts!inner(CUSTOMER_ID)'
        ).execute()

        activities_response = client.table('sales_activities').select(
            'CUSTOMER_ID, ACTIVITY_DATE, ACTIVITY_TYPE, OUTCOME'
        ).execute()

        orders_data = []
        for item in orders_response.data:
            flat_item = {
                'CONTACT_ID': item['CONTACT_ID'],
                'ORDER_DATE': item['ORDER_DATE'],
                'AMOUNT': item['AMOUNT'],
                'CUSTOMER_ID': item['contacts']['CUSTOMER_ID'] if item.get('contacts') else None
            }
            orders_data.append(flat_item)

        orders_df = pd.DataFrame(orders_data).dropna(subset=['CUSTOMER_ID'])
        activities_df = pd.DataFrame(activities_response.data)
        
        print(f"로드 완료: {len(orders_df)}개의 주문, {len(activities_df)}개의 활동.")
        return orders_df, activities_df
        
    except Exception as e:
        print(f"Supabase 데이터 로딩 오류: {e}")
        return None, None

# 이 부분에 preprocess_data 함수를 추가합니다.
def preprocess_data(orders_df, activities_df):
    # <<< 내부 분석용 이름으로 변경 (대문자 유지) >>>
    orders_df.rename(columns={"ORDER_DATE": "ORDERED_AT", "AMOUNT": "SALES_AMOUNT"}, inplace=True)
    orders_df["ORDERED_AT"] = pd.to_datetime(orders_df["ORDERED_AT"])
    orders_df["MONTH_TS"] = orders_df["ORDERED_AT"].dt.to_period("M").dt.to_timestamp()

    activities_df.rename(columns={"ACTIVITY_DATE": "CONTACTED_AT"}, inplace=True)
    activities_df["CONTACTED_AT"] = pd.to_datetime(activities_df["CONTACTED_AT"])
    activities_df["MONTH_TS"] = activities_df["CONTACTED_AT"].dt.to_period("M").dt.to_timestamp()
    return orders_df, activities_df

def update_or_insert_forecasts_db(client: Client, customer_id, forecast_df_to_save, table_name, current_run_datetime):
    # <<< 모든 DB 인터랙션(SELECT, INSERT, UPDATE)의 컬럼명을 대문자로 수정 >>>
    forecast_df_to_save['PREDICTED_DATE_ISO'] = pd.to_datetime(forecast_df_to_save['PREDICTED_DATE']).dt.strftime('%Y-%m-%d')
    min_pred_date = forecast_df_to_save['PREDICTED_DATE_ISO'].min()
    max_pred_date = forecast_df_to_save['PREDICTED_DATE_ISO'].max()

    old_forecasts_df = pd.DataFrame(columns=['PREDICTED_DATE', 'MAPE']) # 초기화

    try:
        # SELECT 및 WHERE(.eq) 절의 컬럼명을 대문자로 수정
        print(f"Supabase에서 고객 ID {customer_id}의 기존 예측 데이터 조회 중...")
        response = client.table(table_name).select('PREDICTED_DATE, MAPE').eq('CUSTOMER_ID', customer_id).gte('PREDICTED_DATE', min_pred_date).lte('PREDICTED_DATE', max_pred_date).execute()
        
        print(f"Supabase response.data: {response.data}") # Supabase 응답 데이터 출력
        
        if not response.data:
            print(f"Supabase에서 고객 ID {customer_id}의 기존 예측 데이터가 없습니다.")
        else:
            old_forecasts_df = pd.DataFrame(response.data)
            
            # 필요한 컬럼이 있는지 확인하고 변환
            if 'PREDICTED_DATE' in old_forecasts_df.columns:
                old_forecasts_df['PREDICTED_DATE'] = pd.to_datetime(old_forecasts_df['PREDICTED_DATE'])
            else:
                print(f"경고: Supabase 응답 데이터에 'PREDICTED_DATE' 컬럼이 없습니다. (고객 ID: {customer_id})")
                old_forecasts_df = pd.DataFrame(columns=['PREDICTED_DATE', 'MAPE']) # 오류 방지를 위해 초기화
            
            if 'MAPE' in old_forecasts_df.columns:
                old_forecasts_df['MAPE'] = pd.to_numeric(old_forecasts_df['MAPE'], errors='coerce')
            else:
                print(f"경고: Supabase 응답 데이터에 'MAPE' 컬럼이 없습니다. (고객 ID: {customer_id})")
                if 'PREDICTED_DATE' in old_forecasts_df.columns: # PREDICTED_DATE는 있고 MAPE만 없으면 MAPE 컬럼을 추가하고 NaN으로 채움
                    old_forecasts_df['MAPE'] = np.nan
                else: # 둘 다 없으면 완전히 초기화
                    old_forecasts_df = pd.DataFrame(columns=['PREDICTED_DATE', 'MAPE']) 
            
            print(f"기존 예측 데이터프레임 (고객 ID: {customer_id}):")
            print(old_forecasts_df.head())
            print(old_forecasts_df.dtypes)

    except Exception as e:
        print(f"!!! Supabase 기존 예측 데이터 조회 중 예상치 못한 오류 발생 (고객 ID: {customer_id}): {e}")
        old_forecasts_df = pd.DataFrame(columns=['PREDICTED_DATE', 'MAPE']) # 모든 오류 상황에서 안전하게 초기화

    print(f"\n[DB 작업 결정] 고객 ID: {customer_id}...")
    for _, new_row in forecast_df_to_save.iterrows():
        new_pred_date_dt = new_row['PREDICTED_DATE']
        new_mape = new_row['MAPE'] if pd.notna(new_row['MAPE']) else None
        
        existing_record = old_forecasts_df[old_forecasts_df['PREDICTED_DATE'] == new_pred_date_dt]
        operation, reason = None, "조건 불충족"

        if existing_record.empty:
            operation, reason = 'INSERT', "기존 예측 없음"
        else:
            old_mape = existing_record.iloc[0]['MAPE']
            if pd.isna(old_mape):
                operation, reason = 'UPDATE', "기존 MAPE 없음"
            elif new_mape is not None and old_mape is not None and new_mape < old_mape:
                operation, reason = 'UPDATE', f"성능 향상 (기존 MAPE: {old_mape:.2f}% -> 새 MAPE: {new_mape:.2f}%)"
            else:
                reason = f"성능 저하/동일 (기존 MAPE: {old_mape:.2f}% (또는 None), 새 MAPE: {new_mape})->업데이트 안함"

        print(f"  - 날짜: {new_pred_date_dt.strftime('%Y-%m-%d')}, 결정: {operation or '작업 없음'}, 이유: {reason}")
        
        # INSERT/UPDATE 시 DB 컬럼명과 일치하도록 payload의 모든 key를 대문자로 수정
        db_payload = {
            'CUSTOMER_ID': int(customer_id),
            'PREDICTED_DATE': new_pred_date_dt.strftime('%Y-%m-%d'),
            'PREDICTED_QUANTITY': new_row['PREDICTED_QUANTITY'],
            'MAPE': new_mape,
            'PREDICTION_MODEL': new_row['PREDICTION_MODEL'],
            'FORECAST_GENERATION_DATETIME': current_run_datetime.isoformat()
        }
        
        try:
            if operation == 'INSERT':
                print(f"   -> INSERTing data for {new_pred_date_dt.strftime('%Y-%m-%d')}: {db_payload}")
                client.table(table_name).insert(db_payload).execute()
            elif operation == 'UPDATE':
                print(f"   -> UPDATING data for {new_pred_date_dt.strftime('%Y-%m-%d')}: {db_payload}")
                client.table(table_name).update(db_payload).eq('CUSTOMER_ID', customer_id).eq('PREDICTED_DATE', new_pred_date_dt.strftime('%Y-%m-%d')).execute()
        except Exception as e:
            print(f"!!! Supabase {operation} 작업 실패 (고객 ID: {customer_id}, 날짜: {new_pred_date_dt.strftime('%Y-%m-%d')}): {e}")

# --- 메인 파이프라인 ---
def run_monthly_forecast_pipeline():
    supabase = create_supabase_client()
    if not supabase:
        print("Supabase 클라이언트 초기화 실패로 파이프라인을 종료합니다.")
        return

    orders, activities_df = load_data_from_supabase(supabase)
    if orders is None or activities_df is None: 
        print("데이터 로딩 실패로 파이프라인을 중단합니다.")
        return

    orders, activities_df = preprocess_data(orders, activities_df) # 이 부분에서 preprocess_data를 호출합니다.

    forecast_generation_datetime = datetime.now()
    today_ts = pd.to_datetime(date.today()).to_period("M").to_timestamp()
    future_start_date = today_ts
    
    # 예측할 기간 계산: 현재 달부터 향후 BASE_FUTURE개월
    # 예를 들어 오늘이 2025년 6월 12일이면, 6월부터 12개월 후인 2026년 5월까지 예측
    # forecast_df는 2025-06-01부터 2026-05-01까지의 ds를 포함해야 함.
    predict_n_periods_overall = BASE_FUTURE # 전체 예측 기간 (미래 12개월)

    potential_regressors = ['total_activities_count']
    if 'ACTIVITY_TYPE' in activities_df.columns:
        potential_regressors.extend([f'act_type_{str(act).replace(" ", "_")}' for act in activities_df['ACTIVITY_TYPE'].dropna().unique()])
    if 'OUTCOME' in activities_df.columns:
        potential_regressors.extend([f'outcome_{str(out).replace(" ", "_")}' for out in activities_df['OUTCOME'].dropna().unique()])
    
    for cust_id, grp_orders in tqdm(orders.groupby("CUSTOMER_ID"), desc="고객별 예측"):
        print(f"\n--- 고객 ID: {cust_id} 예측 시작 ---")
        df_sales = grp_orders.groupby("MONTH_TS")["SALES_AMOUNT"].sum().reset_index().rename(columns={"MONTH_TS": "ds", "SALES_AMOUNT": "y"})
        df_sales["ds"] = pd.to_datetime(df_sales["ds"])

        customer_activities = activities_df[activities_df["CUSTOMER_ID"] == cust_id].copy()
        df_model_input = df_sales.copy()
        
        # 외부 변수(활동 데이터) 병합
        if not customer_activities.empty:
            df_model_input = pd.merge(df_model_input, customer_activities.groupby("MONTH_TS").size().reset_index(name="total_activities_count").rename(columns={"MONTH_TS": "ds"}), on="ds", how="left")
            if 'ACTIVITY_TYPE' in customer_activities.columns:
                # get_dummies 후 MONTH_TS 기준으로 합산
                dummies_activities_type = pd.get_dummies(customer_activities, columns=['ACTIVITY_TYPE'], prefix='act_type', dtype=int)
                df_model_input = pd.merge(df_model_input, dummies_activities_type.groupby("MONTH_TS").sum(numeric_only=True).reset_index().rename(columns={"MONTH_TS": "ds"}), on="ds", how="left")
            if 'OUTCOME' in customer_activities.columns:
                # get_dummies 후 MONTH_TS 기준으로 합산
                dummies_outcomes = pd.get_dummies(customer_activities, columns=['OUTCOME'], prefix='outcome', dtype=int)
                df_model_input = pd.merge(df_model_input, dummies_outcomes.groupby("MONTH_TS").sum(numeric_only=True).reset_index().rename(columns={"MONTH_TS": "ds"}), on="ds", how="left")

        # 모든 잠재적 회귀 변수에 대해 컬럼이 없으면 0으로 초기화
        for col in potential_regressors:
            if col not in df_model_input.columns:
                df_model_input[col] = 0
        df_model_input.fillna(0, inplace=True)
        
        # 실제 값이 있는 회귀 변수만 선택
        active_regressors = [col for col in potential_regressors if df_model_input[col].sum() > 0 and col in df_model_input.columns]
        
        print(f"모델 입력 데이터 크기: {len(df_model_input)}, 활성 회귀 변수: {active_regressors}")

        chosen_model_name, chosen_forecast, chosen_mape = "Data Insufficient", None, None

        if len(df_model_input) >= MIN_MONTHS:
            # 미래 회귀 변수 값 계산 (과거 FUTURE_COUNT_WINDOW개월 평균)
            future_regressor_values = {col: round(df_model_input[col].tail(FUTURE_COUNT_WINDOW).mean()) for col in active_regressors}
            print(f"미래 회귀 변수 값 (평균): {future_regressor_values}")

            # 예측할 기간 계산: 현재 데이터의 마지막 ds 이후부터 BASE_FUTURE 기간
            # Prophet의 make_future_dataframe은 ds의 마지막 날짜 기준으로 periods를 추가함.
            # 예를 들어 마지막 데이터가 2024-12-01이면, periods=12는 2025-01-01부터 2025-12-01까지 생성
            # 그러므로 BASE_FUTURE 그대로 사용하면 됨
            predict_n_periods = BASE_FUTURE
            
            prophet_forecast, prophet_mape = None, None
            print("Prophet 모델 시도 중...")
            try:
                model_prophet = Prophet(yearly_seasonality=True, seasonality_mode="additive", stan_backend="CMDSTANPY")
                for reg in active_regressors: model_prophet.add_regressor(reg)
                model_prophet.fit(df_model_input[['ds', 'y'] + active_regressors])
                
                future_df = model_prophet.make_future_dataframe(periods=predict_n_periods, freq="MS")
                # 미래 데이터프레임에 회귀 변수 값 할당
                for reg, val in future_regressor_values.items():
                    future_df[reg] = val

                forecast_p = model_prophet.predict(future_df)
                
                # 예측 결과 중 현재 달부터 BASE_FUTURE 기간만큼만 선택
                # future_df는 마지막 관측치 이후부터 predict_n_periods만큼 생성되므로,
                # forecast_p에서 선택할 필요 없이 future_df 전체가 미래 예측치가 됨.
                prophet_forecast = forecast_p[['ds', 'yhat']].iloc[-predict_n_periods:] # 마지막 예측 기간만큼 선택

                print("Prophet 교차 검증 시작 (parallel=None)...")
                # !!! 중요: parallel="processes" 대신 parallel=None으로 변경하여 웹 환경 충돌 방지
                cv_results = cross_validation(model_prophet, initial=f'{CV_PERIOD_D_PROPHET*3} days', period=f'{CV_PERIOD_D_PROPHET} days', horizon=f'{CV_HORIZON_D_PROPHET} days', parallel=None, disable_tqdm=True)
                
                if not cv_results.empty:
                    metrics = performance_metrics(cv_results)
                    prophet_mape = metrics['mape'].mean() * 100
                    print(f"Prophet MAPE (고객 ID: {cust_id}): {prophet_mape:.2f}%")
                else:
                    print(f"Prophet 교차 검증 결과가 비어있습니다. (고객 ID: {cust_id})")
                    prophet_mape = None
            except Exception as e:
                print(f"!!! Prophet 모델링 실패 (고객 ID: {cust_id}): {e}")
                prophet_forecast, prophet_mape = None, None

            arima_forecast, arima_mape = None, None
            print("ARIMA 모델 시도 중...")
            # ARIMA 모델은 Prophet보다 더 많은 데이터가 필요할 수 있음 (계절성 12개월 + 테스트 기간)
            if len(df_model_input) >= 12 + ARIMA_TEST_PERIODS:
                try:
                    y_series = df_model_input.set_index("ds")["y"].asfreq("MS").interpolate()
                    exog_series = df_model_input.set_index("ds")[active_regressors].asfreq("MS").interpolate() if active_regressors else None

                    train_y, test_y = y_series[:-ARIMA_TEST_PERIODS], y_series[-ARIMA_TEST_PERIODS:]
                    train_exog, test_exog = (exog_series[:-ARIMA_TEST_PERIODS], exog_series[-ARIMA_TEST_PERIODS:]) if exog_series is not None else (None, None)
                    
                    print(f"ARIMA 훈련 데이터 크기: {len(train_y)}, 테스트 데이터 크기: {len(test_y)}")

                    # AutoARIMA 모델 학습 (테스트용)
                    eval_model = pm.auto_arima(train_y, exogenous=train_exog, m=12, seasonal=True, suppress_warnings=True, stepwise=True, error_action='ignore')
                    test_pred = eval_model.predict(n_periods=len(test_y), exogenous=test_exog)
                    
                    # MAPE 계산 시 0으로 나누는 오류 방지
                    if np.all(test_y > 0):
                        arima_mape = mean_absolute_percentage_error(test_y, test_pred) * 100
                        print(f"ARIMA MAPE (고객 ID: {cust_id}): {arima_mape:.2f}%")
                    else:
                        print(f"ARIMA MAPE 계산 불가 (테스트 기간에 0 또는 음수 값 포함). (고객 ID: {cust_id})")
                        arima_mape = None

                    # 전체 데이터로 최종 ARIMA 모델 학습 및 미래 예측
                    final_model = pm.auto_arima(y_series, exogenous=exog_series, m=12, seasonal=True, suppress_warnings=True, stepwise=True, error_action='ignore')
                    
                    # 미래 외부 변수 데이터 생성
                    future_exog = None
                    if active_regressors:
                        # 미래 날짜 인덱스 생성 (마지막 관측치 다음 달부터 predict_n_periods 만큼)
                        future_dates = pd.date_range(start=y_series.index[-1] + relativedelta(months=1), periods=predict_n_periods, freq="MS")
                        future_exog = pd.DataFrame(future_regressor_values, index=future_dates)
                        # 컬럼 순서 유지 (final_model 학습 시 사용된 exog_series의 컬럼 순서와 일치)
                        if exog_series is not None:
                            future_exog = future_exog[exog_series.columns] 

                    future_pred = final_model.predict(n_periods=predict_n_periods, exogenous=future_exog)
                    fcst_arima = pd.DataFrame({"ds": future_pred.index, "yhat": future_pred.values})
                    
                    # 예측 결과 중 현재 달부터 BASE_FUTURE 기간만큼만 선택
                    arima_forecast = fcst_arima # ARIMA는 이미 미래 기간만큼만 예측하므로 별도 슬라이싱 불필요

                except Exception as e:
                    print(f"!!! ARIMA 모델링 실패 (고객 ID: {cust_id}): {e}")
                    arima_forecast, arima_mape = None, None
            else:
                print(f"ARIMA 모델링을 위한 데이터 부족 (고객 ID: {cust_id}, 현재 데이터: {len(df_model_input)}개월, 최소 {12+ARIMA_TEST_PERIODS}개월 필요).")


            # 최적 모델 선택
            if prophet_mape is not None and (arima_mape is None or prophet_mape < arima_mape):
                chosen_forecast, chosen_mape, chosen_model_name = prophet_forecast, prophet_mape, "Prophet"
                print(f"최종 선택 모델: Prophet (MAPE: {prophet_mape:.2f}%)")
            elif arima_mape is not None:
                chosen_forecast, chosen_mape, chosen_model_name = arima_forecast, arima_mape, "ARIMA"
                print(f"최종 선택 모델: ARIMA (MAPE: {arima_mape:.2f}%)")
            elif prophet_forecast is not None: # MAPE는 없지만 Prophet 예측이 성공한 경우
                chosen_forecast, chosen_mape, chosen_model_name = prophet_forecast, prophet_mape, "Prophet (No MAPE)"
                print(f"최종 선택 모델: Prophet (MAPE 없음)")
            else:
                chosen_model_name = "Prediction Failed"
                chosen_forecast = pd.DataFrame({'ds': pd.date_range(start=future_start_date, periods=predict_n_periods_overall, freq="MS"), 'yhat': 0})
                print(f"!!! 예측 실패. (고객 ID: {cust_id})")
        else:
            chosen_model_name = "Data Insufficient"
            # 데이터 부족 시에도 미래 예측 기간 만큼 0으로 채워진 df 생성
            chosen_forecast = pd.DataFrame({'ds': pd.date_range(start=future_start_date, periods=predict_n_periods_overall, freq="MS"), 'yhat': 0})
            print(f"데이터 부족 (고객 ID: {cust_id}, 현재 데이터: {len(df_model_input)}개월, 최소 {MIN_MONTHS}개월 필요).")


        # 예측량이 음수가 되지 않도록 조정
        chosen_forecast["yhat"] = np.maximum(0, chosen_forecast["yhat"])
        
        # DB 저장용 데이터프레임 형식 맞추기
        final_df_for_db = chosen_forecast.rename(columns={"ds": "PREDICTED_DATE", "yhat": "PREDICTED_QUANTITY"})
        final_df_for_db["MAPE"] = chosen_mape
        final_df_for_db["PREDICTION_MODEL"] = chosen_model_name
        
        print(f"최종 DB 저장될 예측 데이터 (고객 ID: {cust_id}):")
        print(final_df_for_db.head())
        print(f"DB 저장될 데이터 수: {len(final_df_for_db)}")

        update_or_insert_forecasts_db(supabase, cust_id, final_df_for_db, FORECAST_TABLE_NAME, forecast_generation_datetime)
        
        gc.collect() # 메모리 해제

if __name__ == '__main__':
    if sys.platform.startswith('win'):
        multiprocessing.freeze_support()

    print("월별 주문 예측 파이프라인 시작...")
    try:
        run_monthly_forecast_pipeline()
    except Exception as e:
        print(f"!!! 월별 주문 예측 파이프라인 실행 중 치명적인 오류 발생: {e}")
        import traceback
        traceback.print_exc() # 전체 스택 트레이스 출력

    print("월별 주문 예측 파이프라인 종료.") 