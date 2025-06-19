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
CV_PERIOD_D_PROPHET = 180
CV_HORIZON_D_PROPHET = 90
FUTURE_COUNT_STRATEGY = 'mean'
FUTURE_COUNT_WINDOW = 6
ARIMA_TEST_PERIODS = 3
FORECAST_TABLE_NAME = "customer_order_forecast"

# --- 데이터베이스 헬퍼 함수 ---
def create_supabase_client():
    try:
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return client
    except Exception as e:
        print(f"Supabase 클라이언트 생성 오류: {e}")
        return None

def load_data_from_supabase(client: Client):
    try:
        print("Supabase에서 데이터 로딩 중...")
        orders_response = client.table('orders').select('CONTACT_ID, ORDER_DATE, AMOUNT, contacts!inner(CUSTOMER_ID)').execute()
        activities_response = client.table('sales_activities').select('CUSTOMER_ID, ACTIVITY_DATE, ACTIVITY_TYPE, OUTCOME').execute()

        orders_data = [{'CONTACT_ID': item['CONTACT_ID'], 'ORDER_DATE': item['ORDER_DATE'], 'AMOUNT': item['AMOUNT'], 'CUSTOMER_ID': item['contacts']['CUSTOMER_ID'] if item.get('contacts') else None} for item in orders_response.data]
        orders_df = pd.DataFrame(orders_data).dropna(subset=['CUSTOMER_ID'])
        activities_df = pd.DataFrame(activities_response.data)
        
        print(f"로드 완료: {len(orders_df)}개의 주문, {len(activities_df)}개의 활동.")
        return orders_df, activities_df
    except Exception as e:
        print(f"Supabase 데이터 로딩 오류: {e}")
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
    forecast_df_to_save['PREDICTED_DATE_ISO'] = pd.to_datetime(forecast_df_to_save['PREDICTED_DATE']).dt.strftime('%Y-%m-%d')
    min_pred_date, max_pred_date = forecast_df_to_save['PREDICTED_DATE_ISO'].min(), forecast_df_to_save['PREDICTED_DATE_ISO'].max()

    try:
        response = client.table(table_name).select('PREDICTED_DATE, MAPE').eq('CUSTOMER_ID', customer_id).gte('PREDICTED_DATE', min_pred_date).lte('PREDICTED_DATE', max_pred_date).execute()
        old_forecasts_df = pd.DataFrame(response.data)
        if not old_forecasts_df.empty:
            old_forecasts_df['PREDICTED_DATE'] = pd.to_datetime(old_forecasts_df['PREDICTED_DATE'])
            old_forecasts_df['MAPE'] = pd.to_numeric(old_forecasts_df.get('MAPE'), errors='coerce')
    except Exception as e:
        print(f"!!! Supabase 기존 예측 데이터 조회 중 오류 (고객 ID: {customer_id}): {e}")
        old_forecasts_df = pd.DataFrame(columns=['PREDICTED_DATE', 'MAPE'])

    for _, new_row in forecast_df_to_save.iterrows():
        new_pred_date_dt, new_mape = new_row['PREDICTED_DATE'], new_row.get('MAPE')
        existing_record = old_forecasts_df[old_forecasts_df['PREDICTED_DATE'] == new_pred_date_dt]
        operation = None
        if existing_record.empty:
            operation = 'INSERT'
        else:
            old_mape = existing_record.iloc[0].get('MAPE')
            if pd.isna(old_mape) or (pd.notna(new_mape) and new_mape < old_mape):
                operation = 'UPDATE'
        
        if operation:
            db_payload = {'CUSTOMER_ID': int(customer_id), 'PREDICTED_DATE': new_pred_date_dt.strftime('%Y-%m-%d'), 'PREDICTED_QUANTITY': new_row['PREDICTED_QUANTITY'], 'MAPE': new_mape if pd.notna(new_mape) else None, 'PREDICTION_MODEL': new_row['PREDICTION_MODEL'], 'FORECAST_GENERATION_DATETIME': current_run_datetime.isoformat()}
            try:
                if operation == 'INSERT': client.table(table_name).insert(db_payload).execute()
                elif operation == 'UPDATE': client.table(table_name).update(db_payload).eq('CUSTOMER_ID', customer_id).eq('PREDICTED_DATE', new_pred_date_dt.strftime('%Y-%m-%d')).execute()
            except Exception as e:
                print(f"!!! Supabase {operation} 작업 실패 (고객 ID: {customer_id}, 날짜: {new_pred_date_dt.strftime('%Y-%m-%d')}): {e}")

def process_customer(args):
    """한 명의 고객에 대한 전체 예측 파이프라인을 실행합니다."""
    cust_id, grp_orders, activities_df, potential_regressors, future_dates_fixed, current_run_datetime = args
    
    print(f"\n--- 고객 ID: {cust_id} 예측 시작 (프로세스 ID: {os.getpid()}) ---")
    
    df_sales = grp_orders.groupby("MONTH_TS")["SALES_AMOUNT"].sum().reset_index().rename(columns={"MONTH_TS": "ds", "SALES_AMOUNT": "y"})
    df_sales["ds"] = pd.to_datetime(df_sales["ds"])

    customer_activities = activities_df[activities_df["CUSTOMER_ID"] == cust_id].copy()
    df_model_input = df_sales.copy()

    if not customer_activities.empty:
        df_model_input = pd.merge(df_model_input, customer_activities.groupby("MONTH_TS").size().reset_index(name="total_activities_count").rename(columns={"MONTH_TS": "ds"}), on="ds", how="left")
        if 'ACTIVITY_TYPE' in customer_activities.columns:
            dummies_activities_type = pd.get_dummies(customer_activities, columns=['ACTIVITY_TYPE'], prefix='act_type', dtype=int)
            df_model_input = pd.merge(df_model_input, dummies_activities_type.groupby("MONTH_TS").sum(numeric_only=True).reset_index().rename(columns={"MONTH_TS": "ds"}), on="ds", how="left")
        if 'OUTCOME' in customer_activities.columns:
            dummies_outcomes = pd.get_dummies(customer_activities, columns=['OUTCOME'], prefix='outcome', dtype=int)
            df_model_input = pd.merge(df_model_input, dummies_outcomes.groupby("MONTH_TS").sum(numeric_only=True).reset_index().rename(columns={"MONTH_TS": "ds"}), on="ds", how="left")

    for col in potential_regressors:
        if col not in df_model_input.columns:
            df_model_input[col] = 0
    df_model_input.fillna(0, inplace=True)
    active_regressors = [col for col in potential_regressors if df_model_input[col].sum() > 0 and col in df_model_input.columns]

    chosen_model_name, chosen_forecast, chosen_mape = "Data Insufficient", None, None

    if len(df_model_input) >= MIN_MONTHS:
        future_regressor_values = {col: round(df_model_input[col].tail(FUTURE_COUNT_WINDOW).mean()) for col in active_regressors}
        
        prophet_forecast, prophet_mape = None, None
        try:
            model_prophet = Prophet(yearly_seasonality=True, seasonality_mode="additive", stan_backend="CMDSTANPY")
            for reg in active_regressors: model_prophet.add_regressor(reg)
            model_prophet.fit(df_model_input[['ds', 'y'] + active_regressors])
            
            future_df_prophet = pd.DataFrame({'ds': future_dates_fixed})
            for reg, val in future_regressor_values.items(): future_df_prophet[reg] = val
            forecast_p = model_prophet.predict(future_df_prophet)
            prophet_forecast = forecast_p[['ds', 'yhat']]

            # ✨ 오류 해결: 중첩 병렬 처리 충돌을 피하기 위해 Prophet 내부 병렬 처리를 비활성화합니다.
            cv_results = cross_validation(model_prophet, initial=f'{CV_PERIOD_D_PROPHET*3} days', period=f'{CV_PERIOD_D_PROPHET} days', horizon=f'{CV_HORIZON_D_PROPHET} days', parallel=None, disable_tqdm=True)
            if not cv_results.empty:
                metrics = performance_metrics(cv_results)
                prophet_mape = metrics['mape'].mean() * 100
        except Exception as e:
            print(f"!!! Prophet 모델링 실패 (고객 ID: {cust_id}): {e}")

        arima_forecast, arima_mape = None, None
        if len(df_model_input) >= 12 + ARIMA_TEST_PERIODS:
            try:
                y_series = df_model_input.set_index("ds")["y"].asfreq("MS").interpolate()
                exog_series = df_model_input.set_index("ds")[active_regressors].asfreq("MS").interpolate() if active_regressors else None
                train_y, test_y = y_series[:-ARIMA_TEST_PERIODS], y_series[-ARIMA_TEST_PERIODS:]
                train_exog, test_exog = (exog_series[:-ARIMA_TEST_PERIODS], exog_series[-ARIMA_TEST_PERIODS:]) if exog_series is not None else (None, None)
                eval_model = pm.auto_arima(train_y, exogenous=train_exog, m=12, seasonal=True, suppress_warnings=True, stepwise=True, error_action='ignore')
                test_pred = eval_model.predict(n_periods=len(test_y), exogenous=test_exog)
                if np.all(test_y > 0): arima_mape = mean_absolute_percentage_error(test_y, test_pred) * 100

                final_model = pm.auto_arima(y_series, exogenous=exog_series, m=12, seasonal=True, suppress_warnings=True, stepwise=True, error_action='ignore')
                predict_n_periods_overall = len(future_dates_fixed)
                future_pred = final_model.predict(n_periods=predict_n_periods_overall, exogenous=pd.DataFrame(future_regressor_values, index=future_dates_fixed) if active_regressors else None)
                arima_forecast = pd.DataFrame({"ds": future_pred.index, "yhat": future_pred.values})
            except Exception as e:
                print(f"!!! ARIMA 모델링 실패 (고객 ID: {cust_id}): {e}")

        if prophet_mape is not None and (arima_mape is None or prophet_mape < arima_mape):
            chosen_forecast, chosen_mape, chosen_model_name = prophet_forecast, prophet_mape, "Prophet"
        elif arima_mape is not None:
            chosen_forecast, chosen_mape, chosen_model_name = arima_forecast, arima_mape, "ARIMA"
        elif prophet_forecast is not None:
            chosen_forecast, chosen_mape, chosen_model_name = prophet_forecast, prophet_mape, "Prophet (No MAPE)"
        else:
            chosen_model_name = "Prediction Failed"
    
    if chosen_forecast is None:
        chosen_forecast = pd.DataFrame({'ds': future_dates_fixed, 'yhat': 0})
    
    chosen_forecast["yhat"] = np.maximum(0, chosen_forecast["yhat"])
    final_df_for_db = chosen_forecast.rename(columns={"ds": "PREDICTED_DATE", "yhat": "PREDICTED_QUANTITY"})
    final_df_for_db["MAPE"] = chosen_mape
    final_df_for_db["PREDICTION_MODEL"] = chosen_model_name
    
    supabase_client = create_supabase_client()
    if supabase_client:
        update_or_insert_forecasts_db(supabase_client, cust_id, final_df_for_db, FORECAST_TABLE_NAME, current_run_datetime)
    
    gc.collect()
    return f"고객 ID: {cust_id} 처리 완료. 최종 모델: {chosen_model_name}"

def run_monthly_forecast_pipeline():
    supabase = create_supabase_client()
    if not supabase: return

    orders, activities_df = load_data_from_supabase(supabase)
    if orders is None or activities_df is None: return

    orders, activities_df = preprocess_data(orders, activities_df)

    forecast_generation_datetime = datetime.now()
    future_start_date = pd.to_datetime(date.today()).to_period("M").to_timestamp()
    future_dates_fixed = pd.date_range(start=future_start_date, periods=BASE_FUTURE, freq="MS")
    
    potential_regressors = ['total_activities_count']
    if 'ACTIVITY_TYPE' in activities_df.columns: potential_regressors.extend([f'act_type_{str(act).replace(" ", "_")}' for act in activities_df['ACTIVITY_TYPE'].dropna().unique()])
    if 'OUTCOME' in activities_df.columns: potential_regressors.extend([f'outcome_{str(out).replace(" ", "_")}' for out in activities_df['OUTCOME'].dropna().unique()])
    
    tasks = [
        (cust_id, grp_orders, activities_df, potential_regressors, future_dates_fixed, forecast_generation_datetime)
        for cust_id, grp_orders in orders.groupby("CUSTOMER_ID")
    ]
    
    num_processes = max(1, multiprocessing.cpu_count() - 1)
    print(f"\n{len(tasks)}개의 고객에 대한 예측을 {num_processes}개의 프로세스로 병렬 처리 시작...")

    with multiprocessing.Pool(processes=num_processes) as pool:
        results = list(tqdm(pool.imap(process_customer, tasks), total=len(tasks), desc="고객별 예측 (병렬)"))

    print("\n--- 병렬 처리 결과 ---")
    for result in results:
        print(result)

if __name__ == '__main__':
    if sys.platform.startswith('win'):
        multiprocessing.freeze_support()

    print("월별 주문 예측 파이프라인 시작...")
    try:
        run_monthly_forecast_pipeline()
    except Exception as e:
        print(f"!!! 월별 주문 예측 파이프라인 실행 중 치명적인 오류 발생: {e}")
        import traceback
        traceback.print_exc()

    print("\n월별 주문 예측 파이프라인 종료.")