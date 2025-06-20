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
from sklearn.linear_model import LogisticRegression
import multiprocessing

warnings.filterwarnings("ignore")

# --- Supabase 접속 정보 및 전역 변수 설정 ---
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://rfgtrniqfimnpvheqkaw.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY",
                              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZ3RybmlxZmltbnB2aGVxa2F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTAwMjE4OCwiZXhwIjoyMDY0NTc4MTg4fQ.XVZPaEqjIjE0OIryXhgbB6ZnOdmkuLl6W9USTsE36EI")

MIN_MONTHS = 12
BASE_FUTURE = 12
CV_PERIOD_D_PROPHET = 180  # 6개월
CV_HORIZON_D_PROPHET = 90  # 3개월
FUTURE_COUNT_STRATEGY = 'mean'
FUTURE_COUNT_WINDOW = 6
ARIMA_TEST_PERIODS = 3
FORECAST_TABLE_NAME = "customer_order_forecast"


# --- 데이터베이스 헬퍼 함수 ---
def create_supabase_client():
    try:
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase 클라이언트가 성공적으로 생성되었습니다.")
        return client
    except Exception as e:
        print(f"🔥 Supabase 클라이언트 생성 오류: {e}")
        return None


def load_data_from_supabase(client: Client):
    try:
        print("🚚 Supabase에서 데이터 로딩 중...")
        orders_response = client.table('orders').select(
            'CONTACT_ID, ORDER_DATE, AMOUNT, contacts!inner(CUSTOMER_ID)'
        ).execute()
        activities_response = client.table('sales_activities').select(
            'CUSTOMER_ID, ACTIVITY_DATE, ACTIVITY_TYPE, OUTCOME'
        ).execute()
        orders_data = [
            {'CONTACT_ID': item['CONTACT_ID'], 'ORDER_DATE': item['ORDER_DATE'], 'AMOUNT': item['AMOUNT'],
             'CUSTOMER_ID': item['contacts']['CUSTOMER_ID'] if item.get('contacts') else None}
            for item in orders_response.data
        ]
        orders_df = pd.DataFrame(orders_data).dropna(subset=['CUSTOMER_ID'])
        activities_df = pd.DataFrame(activities_response.data)
        print(f"✅ 로드 완료: {len(orders_df)}개의 주문, {len(activities_df)}개의 활동.")
        return orders_df, activities_df
    except Exception as e:
        print(f"🔥 Supabase 데이터 로딩 오류: {e}")
        return None, None


def preprocess_data(orders_df, activities_df):
    orders_df.rename(columns={"ORDER_DATE": "ORDERED_AT", "AMOUNT": "SALES_AMOUNT"}, inplace=True)
    orders_df["ORDERED_AT"] = pd.to_datetime(orders_df["ORDERED_AT"])
    orders_df["MONTH_TS"] = orders_df["ORDERED_AT"].dt.to_period("M").dt.to_timestamp()
    activities_df.rename(columns={"ACTIVITY_DATE": "CONTACTED_AT"}, inplace=True)
    activities_df["CONTACTED_AT"] = pd.to_datetime(activities_df["CONTACTED_AT"])
    activities_df["MONTH_TS"] = activities_df["CONTACTED_AT"].dt.to_period("M").dt.to_timestamp()
    return orders_df, activities_df


def update_or_insert_forecasts_db(client: Client, customer_id, forecast_df_to_save, table_name, current_run_datetime):
    """첫 번째 코드와 동일한 DB 저장 로직 + PROBABILITY 컬럼 추가"""
    forecast_df_to_save['PREDICTED_DATE_ISO'] = pd.to_datetime(forecast_df_to_save['PREDICTED_DATE']).dt.strftime(
        '%Y-%m-%d')
    min_pred_date = forecast_df_to_save['PREDICTED_DATE_ISO'].min()
    max_pred_date = forecast_df_to_save['PREDICTED_DATE_ISO'].max()

    old_forecasts_df = pd.DataFrame(columns=['PREDICTED_DATE', 'MAPE'])

    try:
        print(f"Supabase에서 고객 ID {customer_id}의 기존 예측 데이터 조회 중...")
        response = client.table(table_name).select('PREDICTED_DATE, MAPE').eq('CUSTOMER_ID', customer_id).gte(
            'PREDICTED_DATE', min_pred_date).lte('PREDICTED_DATE', max_pred_date).execute()

        if not response.data:
            print(f"Supabase에서 고객 ID {customer_id}의 기존 예측 데이터가 없습니다.")
        else:
            old_forecasts_df = pd.DataFrame(response.data)
            if 'PREDICTED_DATE' in old_forecasts_df.columns:
                old_forecasts_df['PREDICTED_DATE'] = pd.to_datetime(old_forecasts_df['PREDICTED_DATE'])
            if 'MAPE' in old_forecasts_df.columns:
                old_forecasts_df['MAPE'] = pd.to_numeric(old_forecasts_df['MAPE'], errors='coerce')
            else:
                old_forecasts_df['MAPE'] = np.nan

    except Exception as e:
        print(f"!!! Supabase 기존 예측 데이터 조회 중 예상치 못한 오류 발생 (고객 ID: {customer_id}): {e}")
        old_forecasts_df = pd.DataFrame(columns=['PREDICTED_DATE', 'MAPE'])

    print(f"\n[DB 작업 결정] 고객 ID: {customer_id}...")
    for _, new_row in forecast_df_to_save.iterrows():
        new_pred_date_dt = new_row['PREDICTED_DATE']
        new_mape = new_row['MAPE'] if pd.notna(new_row['MAPE']) else None
        new_model_name = new_row['PREDICTION_MODEL']

        existing_record = old_forecasts_df[old_forecasts_df['PREDICTED_DATE'] == new_pred_date_dt]
        operation, reason = None, "조건 불충족"

        # 실패 케이스 정의 (Event-Driven 추가)
        is_failure_case = new_model_name in ["Data Insufficient", "Prediction Failed", "Event-Driven (Logistic)"]

        if existing_record.empty:
            operation, reason = 'INSERT', "기존 예측 없음"
        elif is_failure_case:
            operation, reason = 'UPDATE', f"'{new_model_name}' 상태이므로 기존 데이터를 덮어쓰기"
        else:
            # 성공적인 예측의 경우에만 MAPE를 비교
            old_mape = existing_record.iloc[0]['MAPE']
            if pd.isna(old_mape):
                operation, reason = 'UPDATE', "기존 MAPE 없음"
            elif new_mape is not None and old_mape is not None and new_mape < old_mape:
                operation, reason = 'UPDATE', f"성능 향상 (기존 MAPE: {old_mape:.2f}% -> 새 MAPE: {new_mape:.2f}%)"
            else:
                reason = f"성능 저하/동일 (기존 MAPE: {old_mape:.2f}% (또는 None), 새 MAPE: {new_mape})->업데이트 안함"

        print(f"  - 날짜: {new_pred_date_dt.strftime('%Y-%m-%d')}, 결정: {operation or '작업 없음'}, 이유: {reason}")

        # 첫 번째 코드와 동일한 DB payload 구조 + PROBABILITY 추가
        db_payload = {
            'CUSTOMER_ID': int(customer_id),
            'PREDICTED_DATE': new_pred_date_dt.strftime('%Y-%m-%d'),
            'PREDICTED_QUANTITY': new_row['PREDICTED_QUANTITY'],
            'MAPE': new_mape,
            'PREDICTION_MODEL': new_model_name,
            'PROBABILITY': new_row.get('PROBABILITY'),  # 확률 값 추가
            'FORECAST_GENERATION_DATETIME': current_run_datetime.isoformat()
        }

        try:
            if operation == 'INSERT':
                client.table(table_name).insert(db_payload).execute()
            elif operation == 'UPDATE':
                client.table(table_name).update(db_payload).eq('CUSTOMER_ID', customer_id).eq('PREDICTED_DATE',
                                                                                              new_pred_date_dt.strftime(
                                                                                                  '%Y-%m-%d')).execute()
        except Exception as e:
            print(
                f"!!! Supabase {operation} 작업 실패 (고객 ID: {customer_id}, 날짜: {new_pred_date_dt.strftime('%Y-%m-%d')}): {e}")


def create_event_features(orders, activities):
    print("📊 B그룹용 이벤트 예측 모델의 학습 데이터 생성 중...")
    if orders.empty:
        print("⚠️ 주문 데이터가 없어 학습 데이터를 생성할 수 없습니다.")
        return None, None, None

    large_order_threshold = orders['SALES_AMOUNT'].quantile(0.75)
    orders['IS_LARGE_ORDER'] = orders['SALES_AMOUNT'] >= large_order_threshold

    keywords = ['견적', '교체', '대규모', '신규', '제안']
    activities['IS_KEY_ACTIVITY'] = activities['ACTIVITY_TYPE'].str.contains('|'.join(keywords), na=False)

    all_months = pd.date_range(start=orders['MONTH_TS'].min(), end=pd.to_datetime(date.today()), freq='MS')
    all_customers = orders['CUSTOMER_ID'].unique()
    training_df = pd.MultiIndex.from_product([all_customers, all_months], names=['CUSTOMER_ID', 'MONTH_TS']).to_frame(
        index=False)

    key_activities_monthly = activities[activities['IS_KEY_ACTIVITY']].groupby(
        ['CUSTOMER_ID', 'MONTH_TS']).size().reset_index(name='KEY_ACTIVITY_COUNT')
    training_df = pd.merge(training_df, key_activities_monthly, on=['CUSTOMER_ID', 'MONTH_TS'], how='left').fillna(0)
    training_df['KEY_ACTIVITY_LAST_6M'] = training_df.groupby('CUSTOMER_ID')['KEY_ACTIVITY_COUNT'].transform(
        lambda x: x.rolling(6, min_periods=1).sum())

    large_orders = orders[orders['IS_LARGE_ORDER']]
    last_large_order_month = large_orders.groupby('CUSTOMER_ID')['MONTH_TS'].max().reset_index().rename(
        columns={'MONTH_TS': 'LAST_LARGE_ORDER_TS'})
    training_df = pd.merge(training_df, last_large_order_month, on='CUSTOMER_ID', how='left')

    training_df['MONTHS_SINCE_LAST_LARGE'] = (
                (training_df['MONTH_TS'].dt.year - training_df['LAST_LARGE_ORDER_TS'].dt.year) * 12 +
                (training_df['MONTH_TS'].dt.month - training_df['LAST_LARGE_ORDER_TS'].dt.month))
    training_df['MONTHS_SINCE_LAST_LARGE'] = training_df.groupby('CUSTOMER_ID')[
        'MONTHS_SINCE_LAST_LARGE'].ffill().fillna(120).clip(lower=0)

    large_order_monthly = large_orders.groupby(['CUSTOMER_ID', 'MONTH_TS']).size().reset_index(name='HAS_LARGE_ORDER')
    training_df = pd.merge(training_df, large_order_monthly[['CUSTOMER_ID', 'MONTH_TS', 'HAS_LARGE_ORDER']],
                           on=['CUSTOMER_ID', 'MONTH_TS'], how='left').fillna(0)
    training_df['TARGET'] = training_df.groupby('CUSTOMER_ID')['HAS_LARGE_ORDER'].transform(
        lambda x: x.rolling(6, min_periods=1).max().shift(-6)).fillna(0)

    features = ['KEY_ACTIVITY_LAST_6M', 'MONTHS_SINCE_LAST_LARGE']
    X = training_df[features]
    y = training_df['TARGET']

    print("✅ 학습 데이터 생성 완료.")
    return X, y, training_df


def train_event_model(X, y):
    print("🧠 B그룹용 이벤트 예측 모델 학습 중...")
    model = LogisticRegression(class_weight='balanced', random_state=42)
    model.fit(X, y)
    print("✅ 모델 학습 완료.")
    return model


# --- 메인 파이프라인 ---
def run_monthly_forecast_pipeline():
    supabase = create_supabase_client()
    if not supabase: return

    orders, activities_df = load_data_from_supabase(supabase)
    if orders is None or orders.empty:
        print("주문 데이터가 없어 파이프라인을 종료합니다.")
        return

    orders, activities_df = preprocess_data(orders, activities_df)
    forecast_generation_datetime = datetime.now()
    future_start_date = pd.to_datetime(date.today()).to_period("M").to_timestamp()
    future_dates_fixed = pd.date_range(start=future_start_date, periods=BASE_FUTURE, freq="MS")

    # --- 1. 이벤트 예측 모델 학습 ---
    X_train, y_train, training_df_full = create_event_features(orders, activities_df)
    event_model = train_event_model(X_train, y_train)

    # --- 2. B그룹(특별 관리) 분류 ---
    print("\n📊 '특별 관리 고객(B그룹)' 분류 중...")
    customer_first_order = orders.groupby('CUSTOMER_ID')['MONTH_TS'].min()
    customer_active_months = orders.groupby('CUSTOMER_ID')['MONTH_TS'].nunique()
    current_month_period = pd.to_datetime(date.today()).to_period('M')
    total_lifespan_months = ((current_month_period.year - customer_first_order.dt.year) * 12 + (
                current_month_period.month - customer_first_order.dt.month) + 1).fillna(0)
    total_lifespan_months[total_lifespan_months <= 0] = 1
    active_ratio = (customer_active_months / total_lifespan_months).fillna(0)
    INACTIVITY_RATIO_THRESHOLD = 0.90
    group_b_customer_ids = set(active_ratio[active_ratio <= (1 - INACTIVITY_RATIO_THRESHOLD)].index)
    print(f"✅ 분류 완료: 총 {len(group_b_customer_ids)}명의 고객이 특별 관리 그룹(B그룹)으로 분류되었습니다.")

    # B그룹 고객의 과거 대량 주문 평균액 계산
    large_order_threshold = orders['SALES_AMOUNT'].quantile(0.75)
    avg_large_order_amount = orders[orders['SALES_AMOUNT'] >= large_order_threshold].groupby('CUSTOMER_ID')[
        'SALES_AMOUNT'].mean()

    potential_regressors = ['total_activities_count']
    if 'ACTIVITY_TYPE' in activities_df.columns:
        potential_regressors.extend(
            [f'act_type_{str(act).replace(" ", "_")}' for act in activities_df['ACTIVITY_TYPE'].dropna().unique()])
    if 'OUTCOME' in activities_df.columns:
        potential_regressors.extend(
            [f'outcome_{str(out).replace(" ", "_")}' for out in activities_df['OUTCOME'].dropna().unique()])

    for cust_id, grp_orders in tqdm(orders.groupby("CUSTOMER_ID"), desc="고객별 예측"):
        print(f"\n--- 고객 ID: {cust_id} 예측 시작 ---")

        if cust_id in group_b_customer_ids:
            # --- 그룹 B: 이벤트 예측 ---
            print(f"➡️  그룹 B (이벤트 예측): 특별 관리 대상으로 분류되었습니다.")

            future_features_list = []
            base_months_since = \
            training_df_full[training_df_full['CUSTOMER_ID'] == cust_id]['MONTHS_SINCE_LAST_LARGE'].iloc[-1]
            base_activities = training_df_full[training_df_full['CUSTOMER_ID'] == cust_id]['KEY_ACTIVITY_LAST_6M'].iloc[
                -1]

            for i in range(BASE_FUTURE):
                future_features_list.append(
                    {'KEY_ACTIVITY_LAST_6M': base_activities, 'MONTHS_SINCE_LAST_LARGE': base_months_since + i + 1})

            future_features_df = pd.DataFrame(future_features_list)
            purchase_probabilities = event_model.predict_proba(future_features_df)[:, 1]

            purchase_threshold = 0.5
            avg_order_val = avg_large_order_amount.get(cust_id, 0)
            predicted_quantities = [avg_order_val if prob >= purchase_threshold else 0 for prob in
                                    purchase_probabilities]

            chosen_model_name = "Event-Driven (Logistic)"
            chosen_forecast = pd.DataFrame(
                {'ds': future_dates_fixed, 'yhat': predicted_quantities, 'PROBABILITY': purchase_probabilities})
            chosen_mape = None

        else:
            # --- 그룹 A: 시계열 예측 (Prophet + ARIMA) ---
            print(f"➡️  그룹 A (시계열 예측): 일반 예측 대상으로 분류되었습니다.")
            df_sales = grp_orders.groupby("MONTH_TS")["SALES_AMOUNT"].sum().reset_index().rename(
                columns={"MONTH_TS": "ds", "SALES_AMOUNT": "y"})
            df_sales["ds"] = pd.to_datetime(df_sales["ds"])
            customer_activities = activities_df[activities_df["CUSTOMER_ID"] == cust_id].copy()
            df_model_input = df_sales.copy()

            if not customer_activities.empty:
                df_model_input = pd.merge(df_model_input, customer_activities.groupby("MONTH_TS").size().reset_index(
                    name="total_activities_count").rename(columns={"MONTH_TS": "ds"}), on="ds", how="left")
                if 'ACTIVITY_TYPE' in customer_activities.columns:
                    dummies_activities_type = pd.get_dummies(customer_activities, columns=['ACTIVITY_TYPE'],
                                                             prefix='act_type', dtype=int)
                    df_model_input = pd.merge(df_model_input, dummies_activities_type.groupby("MONTH_TS").sum(
                        numeric_only=True).reset_index().rename(columns={"MONTH_TS": "ds"}), on="ds", how="left")
                if 'OUTCOME' in customer_activities.columns:
                    dummies_outcomes = pd.get_dummies(customer_activities, columns=['OUTCOME'], prefix='outcome',
                                                      dtype=int)
                    df_model_input = pd.merge(df_model_input, dummies_outcomes.groupby("MONTH_TS").sum(
                        numeric_only=True).reset_index().rename(columns={"MONTH_TS": "ds"}), on="ds", how="left")

            for col in potential_regressors:
                if col not in df_model_input.columns:
                    df_model_input[col] = 0
            df_model_input.fillna(0, inplace=True)

            active_regressors = [col for col in potential_regressors if
                                 df_model_input[col].sum() > 0 and col in df_model_input.columns]

            print(f"모델 입력 데이터 크기: {len(df_model_input)}, 활성 회귀 변수: {active_regressors}")

            chosen_model_name, chosen_forecast, chosen_mape = "Data Insufficient", None, None

            if len(df_model_input) >= MIN_MONTHS:
                future_regressor_values = {col: round(df_model_input[col].tail(FUTURE_COUNT_WINDOW).mean()) for col in
                                           active_regressors}
                print(f"미래 회귀 변수 값 (평균): {future_regressor_values}")

                # Prophet 모델 시도
                prophet_forecast, prophet_mape = None, None
                print("Prophet 모델 시도 중...")
                try:
                    model_prophet = Prophet(yearly_seasonality=True, seasonality_mode="additive",
                                            stan_backend="CMDSTANPY")
                    for reg in active_regressors:
                        model_prophet.add_regressor(reg)
                    model_prophet.fit(df_model_input[['ds', 'y'] + active_regressors])

                    future_df_prophet = pd.DataFrame({'ds': future_dates_fixed})
                    for reg, val in future_regressor_values.items():
                        future_df_prophet[reg] = val

                    forecast_p = model_prophet.predict(future_df_prophet)
                    prophet_forecast = forecast_p[['ds', 'yhat']]

                    # Prophet 교차 검증 (첫 번째 코드와 동일)
                    print("Prophet 교차 검증 시작 (parallel=None)...")
                    cv_results = cross_validation(model_prophet, initial=f'{CV_PERIOD_D_PROPHET * 3} days',
                                                  period=f'{CV_PERIOD_D_PROPHET} days',
                                                  horizon=f'{CV_HORIZON_D_PROPHET} days', parallel=None,
                                                  disable_tqdm=True)

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

                # ARIMA 모델 시도 (첫 번째 코드와 동일 로직)
                arima_forecast, arima_mape = None, None
                print("ARIMA 모델 시도 중...")
                if len(df_model_input) >= 12 + ARIMA_TEST_PERIODS:
                    try:
                        y_series = df_model_input.set_index("ds")["y"].asfreq("MS").interpolate()
                        exog_series = df_model_input.set_index("ds")[active_regressors].asfreq(
                            "MS").interpolate() if active_regressors else None

                        train_y, test_y = y_series[:-ARIMA_TEST_PERIODS], y_series[-ARIMA_TEST_PERIODS:]
                        train_exog, test_exog = (exog_series[:-ARIMA_TEST_PERIODS],
                                                 exog_series[-ARIMA_TEST_PERIODS:]) if exog_series is not None else (
                        None, None)

                        eval_model = pm.auto_arima(train_y, exogenous=train_exog, m=12, seasonal=True,
                                                   suppress_warnings=True, stepwise=True, error_action='ignore')
                        test_pred = eval_model.predict(n_periods=len(test_y), exogenous=test_exog)

                        if np.all(test_y > 0):
                            arima_mape = mean_absolute_percentage_error(test_y, test_pred) * 100
                            print(f"ARIMA MAPE (고객 ID: {cust_id}): {arima_mape:.2f}%")
                        else:
                            arima_mape = None

                        final_model = pm.auto_arima(y_series, exogenous=exog_series, m=12, seasonal=True,
                                                    suppress_warnings=True, stepwise=True, error_action='ignore')

                        last_data_date = y_series.index[-1]
                        gap_months = (future_start_date.year - last_data_date.year) * 12 + (
                                    future_start_date.month - last_data_date.month)
                        gap_months = max(0, gap_months)
                        total_periods_to_predict = gap_months + BASE_FUTURE

                        future_exog = None
                        if active_regressors:
                            future_exog_dates = pd.date_range(start=last_data_date + relativedelta(months=1),
                                                              periods=total_periods_to_predict, freq="MS")
                            future_exog = pd.DataFrame(future_regressor_values, index=future_exog_dates)
                            if exog_series is not None:
                                future_exog = future_exog[exog_series.columns]

                        full_future_pred = final_model.predict(n_periods=total_periods_to_predict,
                                                               exogenous=future_exog)
                        future_pred = full_future_pred.iloc[-BASE_FUTURE:]

                        arima_forecast = pd.DataFrame({"ds": future_pred.index, "yhat": future_pred.values})

                    except Exception as e:
                        print(f"!!! ARIMA 모델링 실패 (고객 ID: {cust_id}): {e}")
                        arima_forecast, arima_mape = None, None
                else:
                    print(f"ARIMA 모델링을 위한 데이터 부족 (고객 ID: {cust_id}).")

                # 모델 선택 로직 (첫 번째 코드와 동일)
                if prophet_mape is not None and (arima_mape is None or prophet_mape < arima_mape):
                    chosen_forecast, chosen_mape, chosen_model_name = prophet_forecast, prophet_mape, "Prophet"
                    print(f"최종 선택 모델: Prophet (MAPE: {prophet_mape:.2f}%)")
                elif arima_mape is not None:
                    chosen_forecast, chosen_mape, chosen_model_name = arima_forecast, arima_mape, "ARIMA"
                    print(f"최종 선택 모델: ARIMA (MAPE: {arima_mape:.2f}%)")
                elif prophet_forecast is not None:
                    chosen_forecast, chosen_mape, chosen_model_name = prophet_forecast, prophet_mape, "Prophet (No MAPE)"
                    print(f"최종 선택 모델: Prophet (MAPE 없음)")
                else:
                    chosen_model_name = "Prediction Failed"
                    chosen_forecast = pd.DataFrame({'ds': future_dates_fixed, 'yhat': 0})
                    print(f"!!! 예측 실패. (고객 ID: {cust_id})")
            else:
                chosen_model_name = "Data Insufficient"
                chosen_forecast = pd.DataFrame({'ds': future_dates_fixed, 'yhat': 0})
                print(f"데이터 부족 (고객 ID: {cust_id}).")

        # --- 공통 후처리 및 저장 로직 ---
        chosen_forecast["yhat"] = np.maximum(0, chosen_forecast["yhat"])
        final_df_for_db = chosen_forecast.rename(columns={"ds": "PREDICTED_DATE", "yhat": "PREDICTED_QUANTITY"})
        final_df_for_db["MAPE"] = chosen_mape
        final_df_for_db["PREDICTION_MODEL"] = chosen_model_name

        # PROBABILITY 컬럼이 없으면 None으로 설정
        if 'PROBABILITY' not in final_df_for_db.columns:
            final_df_for_db['PROBABILITY'] = None

        print(f"💾 최종 예측 데이터 (모델: {chosen_model_name}):")
        print(final_df_for_db.head())
        print(f"DB 저장될 데이터 수: {len(final_df_for_db)}")

        update_or_insert_forecasts_db(supabase, cust_id, final_df_for_db, FORECAST_TABLE_NAME,
                                      forecast_generation_datetime)

        gc.collect()


if __name__ == '__main__':
    if sys.platform.startswith('win'):
        multiprocessing.freeze_support()

    print("🚀 월별 주문 예측 파이프라인 시작...")
    try:
        run_monthly_forecast_pipeline()
    except Exception as e:
        print(f"!!! 월별 주문 예측 파이프라인 실행 중 치명적인 오류 발생: {e}")
        import traceback

        traceback.print_exc()

    print("🏁 월별 주문 예측 파이프라인 종료.")
