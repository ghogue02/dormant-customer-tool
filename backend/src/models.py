from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from decimal import Decimal
import pandas as pd


class SalesRecord(BaseModel):
    """Individual sales transaction record."""
    invoice_number: str
    invoice_date: date
    posted_date: date
    customer: str
    salesperson: str
    item: str
    quantity: int = Field(gt=0)
    net_price: Decimal = Field(gt=0)
    supplier: Optional[str] = None
    sku: Optional[str] = None

    @validator('posted_date', 'invoice_date')
    def validate_dates(cls, v):
        if isinstance(v, str):
            return datetime.strptime(v, '%m/%d/%Y').date()
        return v

    @validator('net_price')
    def validate_price(cls, v):
        if isinstance(v, str):
            return Decimal(v.replace(',', ''))
        return Decimal(str(v))


class CustomerMapping(BaseModel):
    """Customer to salesperson mapping from planning sheet."""
    customer: str
    assigned_rep: str
    territory: Optional[str] = None
    segment: Optional[str] = None


class DormantCustomer(BaseModel):
    """Dormant customer with analytics."""
    customer: str
    salesperson: str
    last_order_date: date
    days_since_order: int
    total_6_month_value: Decimal
    order_count_6_months: int
    average_order_value: Decimal
    churn_risk_score: float = Field(ge=0, le=1)
    customer_lifetime_value: Decimal
    preferred_products: List[str]
    seasonal_pattern: Optional[str] = None


class SalespersonSummary(BaseModel):
    """Summary statistics for a salesperson."""
    salesperson: str
    dormant_customer_count: int
    total_value_at_risk: Decimal
    high_value_dormant_count: int
    quick_win_count: int
    average_churn_risk: float


class ProcessingResult(BaseModel):
    """Complete processing result with insights."""
    summary: Dict[str, Any]
    salesperson_summaries: List[SalespersonSummary]
    dormant_customers: List[DormantCustomer]
    insights: Dict[str, str]
    data_quality_report: Dict[str, Any]
    processing_timestamp: datetime
    total_customers_analyzed: int
    data_accuracy_score: float


class DataQualityReport(BaseModel):
    """Data quality and validation results."""
    total_records: int
    valid_records: int
    duplicate_records: int
    missing_customer_mappings: int
    invalid_dates: int
    invalid_prices: int
    data_completeness_score: float
    recommendations: List[str]


class AnalyticsConfig(BaseModel):
    """Configuration for analytics processing."""
    today_date: date = Field(default_factory=date.today)
    dormant_days_threshold: int = 45
    analysis_period_months: int = 6
    high_value_threshold: Decimal = Decimal('1000')
    quick_win_threshold: Decimal = Decimal('500')
    min_orders_for_pattern: int = 3