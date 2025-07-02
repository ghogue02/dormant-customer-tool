import pandas as pd
import numpy as np
from datetime import datetime, timedelta, date
from typing import Dict, List, Tuple, Optional
from decimal import Decimal
import logging
from pathlib import Path
import re

from .models import (
    SalesRecord, CustomerMapping, DormantCustomer, 
    SalespersonSummary, ProcessingResult, DataQualityReport, AnalyticsConfig
)

logger = logging.getLogger(__name__)


class DataValidator:
    """Advanced data validation and cleaning."""
    
    @staticmethod
    def validate_sales_data(df: pd.DataFrame) -> Tuple[pd.DataFrame, DataQualityReport]:
        """Validate and clean sales data with detailed reporting."""
        initial_count = len(df)
        issues = []
        
        # Convert dates
        date_columns = ['Invoice date', 'Posted date']
        for col in date_columns:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors='coerce')
                invalid_dates = df[col].isna().sum()
                if invalid_dates > 0:
                    issues.append(f"{invalid_dates} invalid dates in {col}")
        
        # Clean and validate prices
        if 'Net price' in df.columns:
            df['Net price'] = pd.to_numeric(df['Net price'], errors='coerce')
            invalid_prices = df['Net price'].isna().sum()
            if invalid_prices > 0:
                issues.append(f"{invalid_prices} invalid prices")
            df['Net price'] = df['Net price'].fillna(0)
        
        # Remove completely invalid rows
        df_clean = df.dropna(subset=['Posted date', 'Customer'])
        removed_count = initial_count - len(df_clean)
        
        # Detect duplicates
        duplicates = df_clean.duplicated().sum()
        
        quality_report = DataQualityReport(
            total_records=initial_count,
            valid_records=len(df_clean),
            duplicate_records=duplicates,
            missing_customer_mappings=0,  # Will be updated later
            invalid_dates=df['Posted date'].isna().sum() if 'Posted date' in df.columns else 0,
            invalid_prices=df['Net price'].isna().sum() if 'Net price' in df.columns else 0,
            data_completeness_score=len(df_clean) / initial_count if initial_count > 0 else 0,
            recommendations=issues
        )
        
        return df_clean, quality_report


class AdvancedAnalytics:
    """Advanced customer analytics and insights."""
    
    @staticmethod
    def calculate_churn_risk_score(customer_data: pd.DataFrame, config: AnalyticsConfig) -> float:
        """Calculate churn risk score based on multiple factors."""
        if customer_data.empty:
            return 0.5
        
        # Factors contributing to churn risk
        days_since_last_order = (config.today_date - customer_data['Posted date'].max().date()).days
        order_frequency = len(customer_data) / (config.analysis_period_months * 30)
        avg_order_value = customer_data['Net price'].mean()
        value_trend = AdvancedAnalytics._calculate_value_trend(customer_data)
        
        # Normalize factors (0-1 scale)
        recency_score = min(days_since_last_order / 90, 1.0)  # Higher = worse
        frequency_score = max(1 - order_frequency, 0)  # Lower frequency = higher risk
        value_score = max(1 - (avg_order_value / 1000), 0)  # Lower value = higher risk
        trend_score = max(1 - value_trend, 0)  # Declining trend = higher risk
        
        # Weighted average
        risk_score = (
            recency_score * 0.4 +
            frequency_score * 0.3 +
            value_score * 0.2 +
            trend_score * 0.1
        )
        
        return min(max(risk_score, 0), 1)
    
    @staticmethod
    def _calculate_value_trend(customer_data: pd.DataFrame) -> float:
        """Calculate trend in customer spending over time."""
        if len(customer_data) < 3:
            return 0.5
        
        monthly_spending = customer_data.groupby(
            customer_data['Posted date'].dt.to_period('M')
        )['Net price'].sum().sort_index()
        
        if len(monthly_spending) < 2:
            return 0.5
        
        # Simple trend calculation
        x = np.arange(len(monthly_spending))
        y = monthly_spending.values
        
        if len(x) >= 2:
            slope = np.polyfit(x, y, 1)[0]
            return max(min(slope / np.mean(y) + 0.5, 1), 0)
        
        return 0.5
    
    @staticmethod
    def calculate_customer_lifetime_value(customer_data: pd.DataFrame) -> Decimal:
        """Calculate estimated customer lifetime value."""
        if customer_data.empty:
            return Decimal('0')
        
        total_spent = customer_data['Net price'].sum()
        order_count = len(customer_data)
        avg_order_value = total_spent / order_count if order_count > 0 else 0
        
        # Simple CLV estimation: avg_order_value * estimated_future_orders
        # Assuming 12 orders per year for active customers
        estimated_annual_orders = max(order_count * 2, 6)  # Conservative estimate
        clv = avg_order_value * estimated_annual_orders
        
        return Decimal(str(round(clv, 2)))
    
    @staticmethod
    def identify_seasonal_patterns(customer_data: pd.DataFrame) -> Optional[str]:
        """Identify seasonal purchasing patterns."""
        if len(customer_data) < 6:
            return None
        
        monthly_orders = customer_data.groupby(
            customer_data['Posted date'].dt.month
        ).size()
        
        if monthly_orders.empty:
            return None
        
        peak_month = monthly_orders.idxmax()
        
        seasonal_map = {
            (12, 1, 2): "Winter",
            (3, 4, 5): "Spring", 
            (6, 7, 8): "Summer",
            (9, 10, 11): "Fall"
        }
        
        for months, season in seasonal_map.items():
            if peak_month in months:
                return f"{season} buyer"
        
        return "No clear pattern"


class DormantCustomerProcessor:
    """Main processor for dormant customer analysis."""
    
    def __init__(self, config: AnalyticsConfig = None):
        self.config = config or AnalyticsConfig()
        self.validator = DataValidator()
        self.analytics = AdvancedAnalytics()
    
    def process_files(self, sales_file_path: str, planning_file_path: str) -> ProcessingResult:
        """Process sales and planning files to generate dormant customer report."""
        try:
            # Load and validate data
            sales_df = self._load_sales_data(sales_file_path)
            planning_df = self._load_planning_data(planning_file_path)
            
            # Validate and clean sales data
            sales_df_clean, quality_report = self.validator.validate_sales_data(sales_df)
            
            # Apply customer-rep mappings
            sales_df_mapped = self._apply_customer_mappings(sales_df_clean, planning_df)
            
            # Update quality report with mapping info
            unmapped_customers = sales_df_mapped['Salesperson'].isna().sum()
            quality_report.missing_customer_mappings = unmapped_customers
            
            # Identify dormant customers
            dormant_customers = self._identify_dormant_customers(sales_df_mapped)
            
            # Generate analytics and insights
            salesperson_summaries = self._generate_salesperson_summaries(dormant_customers)
            insights = self._generate_insights(dormant_customers, salesperson_summaries)
            
            # Calculate data accuracy score
            accuracy_score = self._calculate_accuracy_score(quality_report)
            
            return ProcessingResult(
                summary={
                    "total_dormant_customers": len(dormant_customers),
                    "total_value_at_risk": sum(dc.total_6_month_value for dc in dormant_customers),
                    "average_churn_risk": np.mean([dc.churn_risk_score for dc in dormant_customers]) if dormant_customers else 0,
                    "data_quality_score": accuracy_score
                },
                salesperson_summaries=salesperson_summaries,
                dormant_customers=dormant_customers,
                insights=insights,
                data_quality_report=quality_report.__dict__,
                processing_timestamp=datetime.now(),
                total_customers_analyzed=sales_df_mapped['Customer'].nunique(),
                data_accuracy_score=accuracy_score
            )
            
        except Exception as e:
            logger.error(f"Processing failed: {str(e)}")
            raise
    
    def _load_sales_data(self, file_path: str) -> pd.DataFrame:
        """Load and preprocess sales data."""
        if file_path.endswith('.csv'):
            # Skip the header rows that aren't part of the data
            df = pd.read_csv(file_path, skiprows=2)
        else:
            df = pd.read_excel(file_path)
        
        return df
    
    def _load_planning_data(self, file_path: str) -> pd.DataFrame:
        """Load planning data with customer mappings."""
        if file_path.endswith('.xlsx'):
            # Try different sheet names
            try:
                df = pd.read_excel(file_path, sheet_name='Planning')
            except:
                df = pd.read_excel(file_path, sheet_name=0)
        else:
            df = pd.read_csv(file_path)
        
        return df
    
    def _apply_customer_mappings(self, sales_df: pd.DataFrame, planning_df: pd.DataFrame) -> pd.DataFrame:
        """Apply correct customer-to-salesperson mappings."""
        # Create mapping dictionary
        customer_mapping = {}
        
        # Try different column name variations
        customer_col = None
        rep_col = None
        
        for col in planning_df.columns:
            if 'customer' in col.lower():
                customer_col = col
            elif 'rep' in col.lower() or 'salesperson' in col.lower() or 'assigned' in col.lower():
                rep_col = col
        
        if customer_col and rep_col:
            customer_mapping = dict(zip(planning_df[customer_col], planning_df[rep_col]))
        
        # Apply mappings
        sales_df = sales_df.copy()
        sales_df['Salesperson_Original'] = sales_df['Salesperson']
        sales_df['Salesperson'] = sales_df['Customer'].map(customer_mapping).fillna(sales_df['Salesperson'])
        
        return sales_df
    
    def _identify_dormant_customers(self, sales_df: pd.DataFrame) -> List[DormantCustomer]:
        """Identify and analyze dormant customers."""
        cutoff_date = self.config.today_date - timedelta(days=self.config.dormant_days_threshold)
        analysis_start = self.config.today_date - timedelta(days=self.config.analysis_period_months * 30)
        
        # Filter for analysis period
        period_sales = sales_df[sales_df['Posted date'] >= analysis_start]
        
        # Find last order date for each customer
        customer_last_orders = period_sales.groupby('Customer')['Posted date'].max().reset_index()
        customer_last_orders['last_order_date'] = customer_last_orders['Posted date'].dt.date
        
        # Identify dormant customers (ordered in period but not recently)
        dormant_mask = (
            (customer_last_orders['Posted date'] >= analysis_start) &
            (customer_last_orders['Posted date'] < cutoff_date)
        )
        dormant_customer_names = customer_last_orders[dormant_mask]['Customer'].tolist()
        
        dormant_customers = []
        for customer in dormant_customer_names:
            customer_data = period_sales[period_sales['Customer'] == customer]
            
            if customer_data.empty:
                continue
            
            # Calculate analytics
            churn_risk = self.analytics.calculate_churn_risk_score(customer_data, self.config)
            clv = self.analytics.calculate_customer_lifetime_value(customer_data)
            seasonal_pattern = self.analytics.identify_seasonal_patterns(customer_data)
            
            # Get preferred products (top 3 by quantity)
            product_prefs = customer_data.groupby('Item')['Qty'].sum().nlargest(3).index.tolist()
            
            dormant_customer = DormantCustomer(
                customer=customer,
                salesperson=customer_data['Salesperson'].iloc[0],
                last_order_date=customer_data['Posted date'].max().date(),
                days_since_order=(self.config.today_date - customer_data['Posted date'].max().date()).days,
                total_6_month_value=Decimal(str(customer_data['Net price'].sum())),
                order_count_6_months=len(customer_data),
                average_order_value=Decimal(str(customer_data['Net price'].mean())),
                churn_risk_score=churn_risk,
                customer_lifetime_value=clv,
                preferred_products=product_prefs,
                seasonal_pattern=seasonal_pattern
            )
            
            dormant_customers.append(dormant_customer)
        
        return dormant_customers
    
    def _generate_salesperson_summaries(self, dormant_customers: List[DormantCustomer]) -> List[SalespersonSummary]:
        """Generate summary statistics by salesperson."""
        rep_data = {}
        
        for customer in dormant_customers:
            rep = customer.salesperson
            if rep not in rep_data:
                rep_data[rep] = {
                    'customers': [],
                    'total_value': Decimal('0'),
                    'high_value_count': 0,
                    'quick_win_count': 0,
                    'risk_scores': []
                }
            
            rep_data[rep]['customers'].append(customer)
            rep_data[rep]['total_value'] += customer.total_6_month_value
            rep_data[rep]['risk_scores'].append(customer.churn_risk_score)
            
            if customer.total_6_month_value >= self.config.high_value_threshold:
                rep_data[rep]['high_value_count'] += 1
            elif customer.total_6_month_value <= self.config.quick_win_threshold:
                rep_data[rep]['quick_win_count'] += 1
        
        summaries = []
        for rep, data in rep_data.items():
            summary = SalespersonSummary(
                salesperson=rep,
                dormant_customer_count=len(data['customers']),
                total_value_at_risk=data['total_value'],
                high_value_dormant_count=data['high_value_count'],
                quick_win_count=data['quick_win_count'],
                average_churn_risk=np.mean(data['risk_scores']) if data['risk_scores'] else 0
            )
            summaries.append(summary)
        
        return sorted(summaries, key=lambda x: x.total_value_at_risk, reverse=True)
    
    def _generate_insights(self, dormant_customers: List[DormantCustomer], 
                          summaries: List[SalespersonSummary]) -> Dict[str, str]:
        """Generate AI-powered strategic insights."""
        if not dormant_customers or not summaries:
            return {"error": "No dormant customers found for analysis"}
        
        insights = {}
        
        # Top priority rep
        top_rep = summaries[0]
        insights['top_priority_rep'] = (
            f"Focus on {top_rep.salesperson}, who has ${top_rep.total_value_at_risk:,.2f} "
            f"in sales at risk across {top_rep.dormant_customer_count} dormant customers. "
            f"Average churn risk: {top_rep.average_churn_risk:.1%}"
        )
        
        # Top priority customer
        top_customer = max(dormant_customers, key=lambda x: x.total_6_month_value)
        insights['top_priority_customer'] = (
            f"Prioritize outreach to {top_customer.customer}. "
            f"They represent ${top_customer.total_6_month_value:,.2f} in potential lost revenue "
            f"and are assigned to {top_customer.salesperson}. "
            f"Churn risk: {top_customer.churn_risk_score:.1%}"
        )
        
        # Quick wins
        quick_wins = [s for s in summaries if s.quick_win_count > 0]
        if quick_wins:
            best_quick_win = max(quick_wins, key=lambda x: x.quick_win_count)
            insights['quick_wins'] = (
                f"{best_quick_win.salesperson} has {best_quick_win.quick_win_count} "
                f"quick-win opportunities (customers with lower values but higher re-engagement potential)"
            )
        
        # Seasonal insights
        seasonal_customers = [c for c in dormant_customers if c.seasonal_pattern]
        if seasonal_customers:
            patterns = {}
            for customer in seasonal_customers:
                pattern = customer.seasonal_pattern
                patterns[pattern] = patterns.get(pattern, 0) + 1
            
            top_pattern = max(patterns, key=patterns.get)
            insights['seasonal_insight'] = (
                f"{patterns[top_pattern]} dormant customers are {top_pattern}. "
                f"Consider timing outreach based on their seasonal patterns."
            )
        
        return insights
    
    def _calculate_accuracy_score(self, quality_report: DataQualityReport) -> float:
        """Calculate overall data accuracy score."""
        if quality_report.total_records == 0:
            return 0.0
        
        # Weighted scoring
        completeness_weight = 0.4
        validity_weight = 0.3
        mapping_weight = 0.3
        
        completeness_score = quality_report.data_completeness_score
        validity_score = 1 - (quality_report.invalid_dates + quality_report.invalid_prices) / quality_report.total_records
        mapping_score = 1 - quality_report.missing_customer_mappings / quality_report.total_records
        
        accuracy_score = (
            completeness_score * completeness_weight +
            validity_score * validity_weight +
            mapping_score * mapping_weight
        )
        
        return min(max(accuracy_score, 0), 1)