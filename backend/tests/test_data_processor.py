import pytest
import pandas as pd
from datetime import datetime, date, timedelta
from decimal import Decimal
import tempfile
import os

from src.data_processor import DormantCustomerProcessor, DataValidator, AdvancedAnalytics
from src.models import AnalyticsConfig, SalesRecord, DormantCustomer


class TestDataValidator:
    """Test data validation functionality."""
    
    def test_validate_sales_data_valid(self):
        """Test validation with valid data."""
        data = {
            'Invoice date': ['7/22/2024', '8/15/2024'],
            'Posted date': ['7/22/2024', '8/15/2024'],
            'Customer': ['Test Customer 1', 'Test Customer 2'],
            'Net price': [100.50, 250.00],
            'Salesperson': ['John Doe', 'Jane Smith']
        }
        df = pd.DataFrame(data)
        
        cleaned_df, quality_report = DataValidator.validate_sales_data(df)
        
        assert len(cleaned_df) == 2
        assert quality_report.data_completeness_score == 1.0
        assert quality_report.invalid_dates == 0
        assert quality_report.invalid_prices == 0
    
    def test_validate_sales_data_with_errors(self):
        """Test validation with data errors."""
        data = {
            'Invoice date': ['7/22/2024', 'invalid_date', '8/15/2024'],
            'Posted date': ['7/22/2024', '8/14/2024', 'bad_date'],
            'Customer': ['Test Customer 1', None, 'Test Customer 3'],
            'Net price': [100.50, 'invalid_price', 250.00],
            'Salesperson': ['John Doe', 'Jane Smith', 'Bob Wilson']
        }
        df = pd.DataFrame(data)
        
        cleaned_df, quality_report = DataValidator.validate_sales_data(df)
        
        assert len(cleaned_df) < 3  # Some rows should be removed
        assert quality_report.data_completeness_score < 1.0
        assert quality_report.invalid_dates > 0


class TestAdvancedAnalytics:
    """Test advanced analytics functionality."""
    
    def setup_method(self):
        """Set up test data."""
        self.config = AnalyticsConfig(
            today_date=date(2025, 6, 1),
            dormant_days_threshold=45,
            analysis_period_months=6
        )
        
        # Create sample customer data
        dates = pd.date_range('2025-01-01', '2025-04-01', freq='W')
        self.customer_data = pd.DataFrame({
            'Posted date': dates,
            'Net price': [100, 150, 200, 120, 180, 160, 140, 110, 190, 175, 155, 135, 165],
            'Customer': ['Test Customer'] * len(dates),
            'Item': ['Wine A', 'Wine B', 'Wine A', 'Wine C'] * 3 + ['Wine A']
        })
    
    def test_calculate_churn_risk_score(self):
        """Test churn risk calculation."""
        risk_score = AdvancedAnalytics.calculate_churn_risk_score(
            self.customer_data, self.config
        )
        
        assert 0 <= risk_score <= 1
        assert isinstance(risk_score, float)
    
    def test_calculate_customer_lifetime_value(self):
        """Test CLV calculation."""
        clv = AdvancedAnalytics.calculate_customer_lifetime_value(self.customer_data)
        
        assert clv > 0
        assert isinstance(clv, Decimal)
    
    def test_identify_seasonal_patterns(self):
        """Test seasonal pattern identification."""
        pattern = AdvancedAnalytics.identify_seasonal_patterns(self.customer_data)
        
        assert pattern is not None
        assert isinstance(pattern, str)


class TestDormantCustomerProcessor:
    """Test the main processor functionality."""
    
    def setup_method(self):
        """Set up test files and processor."""
        self.config = AnalyticsConfig(
            today_date=date(2025, 6, 1),
            dormant_days_threshold=45,
            analysis_period_months=6
        )
        self.processor = DormantCustomerProcessor(self.config)
        
        # Create test CSV file
        self.sales_data = {
            'Invoice number': ['147886', '156729', '149737'],
            'Invoice date': ['7/22/2024', '12/5/2024', '3/16/2025'],
            'Posted date': ['7/22/2024', '12/5/2024', '3/16/2025'],
            'Customer': ['Customer A', 'Customer B', 'Customer A'],
            'Salesperson': ['Old Rep', 'Angela Fultz', 'Old Rep'],
            'Item': ['Wine 1', 'Wine 2', 'Wine 3'],
            'Qty': [12, 24, 6],
            'Net price': [150.00, 300.00, 75.00]
        }
        
        self.planning_data = {
            'Customer': ['Customer A', 'Customer B'],
            'Assigned Rep': ['Mike Allen', 'Angela Fultz']
        }
        
        # Create temporary files
        self.sales_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
        self.planning_file = tempfile.NamedTemporaryFile(mode='w', suffix='.xlsx', delete=False)
        
        # Write sales CSV
        df_sales = pd.DataFrame(self.sales_data)
        df_sales.to_csv(self.sales_file.name, index=False)
        
        # Write planning Excel
        df_planning = pd.DataFrame(self.planning_data)
        with pd.ExcelWriter(self.planning_file.name, engine='openpyxl') as writer:
            df_planning.to_excel(writer, sheet_name='Planning', index=False)
        
        self.sales_file.close()
        self.planning_file.close()
    
    def teardown_method(self):
        """Clean up temporary files."""
        os.unlink(self.sales_file.name)
        os.unlink(self.planning_file.name)
    
    def test_load_sales_data(self):
        """Test loading sales data."""
        df = self.processor._load_sales_data(self.sales_file.name)
        
        assert len(df) == 3
        assert 'Customer' in df.columns
        assert 'Net price' in df.columns
    
    def test_load_planning_data(self):
        """Test loading planning data."""
        df = self.processor._load_planning_data(self.planning_file.name)
        
        assert len(df) == 2
        assert 'Customer' in df.columns
        assert 'Assigned Rep' in df.columns
    
    def test_apply_customer_mappings(self):
        """Test customer mapping correction."""
        sales_df = pd.DataFrame(self.sales_data)
        planning_df = pd.DataFrame(self.planning_data)
        
        mapped_df = self.processor._apply_customer_mappings(sales_df, planning_df)
        
        # Check that Customer A is now assigned to Mike Allen
        customer_a_rows = mapped_df[mapped_df['Customer'] == 'Customer A']
        assert all(customer_a_rows['Salesperson'] == 'Mike Allen')
    
    def test_identify_dormant_customers(self):
        """Test dormant customer identification."""
        # Create sales data with dormant customers
        sales_data = pd.DataFrame({
            'Posted date': pd.to_datetime(['2024-12-01', '2025-03-01', '2025-05-20']),
            'Customer': ['Dormant Customer', 'Recent Customer', 'Dormant Customer'],
            'Salesperson': ['Rep 1', 'Rep 2', 'Rep 1'],
            'Item': ['Wine A', 'Wine B', 'Wine C'],
            'Qty': [12, 6, 8],
            'Net price': [200.0, 100.0, 150.0]
        })
        
        dormant_customers = self.processor._identify_dormant_customers(sales_data)
        
        assert len(dormant_customers) > 0
        # Should include Dormant Customer (last order 3/1, which is > 45 days ago from 6/1)
        dormant_names = [c.customer for c in dormant_customers]
        assert 'Dormant Customer' in dormant_names
        assert 'Recent Customer' not in dormant_names
    
    def test_process_files_integration(self):
        """Test end-to-end file processing."""
        result = self.processor.process_files(self.sales_file.name, self.planning_file.name)
        
        assert isinstance(result.summary, dict)
        assert isinstance(result.dormant_customers, list)
        assert isinstance(result.salesperson_summaries, list)
        assert isinstance(result.insights, dict)
        assert result.data_accuracy_score >= 0
        assert result.total_customers_analyzed > 0


class TestDataAccuracy:
    """Test data accuracy and consistency."""
    
    def test_data_consistency_validation(self):
        """Test that processed data maintains consistency."""
        config = AnalyticsConfig(today_date=date(2025, 6, 1))
        processor = DormantCustomerProcessor(config)
        
        # Create consistent test data
        sales_data = pd.DataFrame({
            'Posted date': pd.to_datetime(['2025-01-15', '2025-02-15', '2025-03-15']),
            'Customer': ['Test Customer', 'Test Customer', 'Test Customer'],
            'Salesperson': ['Rep A', 'Rep A', 'Rep A'],
            'Item': ['Wine 1', 'Wine 2', 'Wine 1'],
            'Qty': [6, 12, 6],
            'Net price': [150.0, 300.0, 150.0]
        })
        
        dormant_customers = processor._identify_dormant_customers(sales_data)
        
        if dormant_customers:
            customer = dormant_customers[0]
            
            # Verify calculations
            expected_total = 600.0  # 150 + 300 + 150
            assert float(customer.total_6_month_value) == expected_total
            
            assert customer.order_count_6_months == 3
            assert float(customer.average_order_value) == 200.0  # 600/3
    
    def test_edge_cases(self):
        """Test edge cases and boundary conditions."""
        config = AnalyticsConfig(today_date=date(2025, 6, 1))
        processor = DormantCustomerProcessor(config)
        
        # Test with empty data
        empty_df = pd.DataFrame(columns=['Posted date', 'Customer', 'Salesperson', 'Net price'])
        dormant_customers = processor._identify_dormant_customers(empty_df)
        assert len(dormant_customers) == 0
        
        # Test with exactly on boundary date
        boundary_date = config.today_date - timedelta(days=config.dormant_days_threshold)
        boundary_data = pd.DataFrame({
            'Posted date': [boundary_date],
            'Customer': ['Boundary Customer'],
            'Salesperson': ['Rep'],
            'Item': ['Wine'],
            'Qty': [1],
            'Net price': [100.0]
        })
        
        # Customer on exact boundary should NOT be dormant
        dormant_customers = processor._identify_dormant_customers(boundary_data)
        dormant_names = [c.customer for c in dormant_customers]
        assert 'Boundary Customer' not in dormant_names


if __name__ == "__main__":
    pytest.main([__file__, "-v"])