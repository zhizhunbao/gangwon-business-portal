"""
Nice D&B API data schemas.

Defines data models for Nice D&B API requests and responses.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date


class NiceDnBFinancialData(BaseModel):
    """Financial data for a specific year."""

    year: int = Field(..., description="Year of the financial data")
    revenue: int = Field(..., description="Annual revenue in KRW")
    profit: int = Field(..., description="Annual profit in KRW")
    employees: int = Field(..., description="Number of employees")


class NiceDnBInsight(BaseModel):
    """Business insight or metric."""

    label: str = Field(..., description="Insight label (e.g., '수출 비중')")
    value: str = Field(..., description="Insight value (e.g., '45%')")
    trend: str = Field(
        ..., description="Trend indicator: 'up', 'down', or 'steady'"
    )


class NiceDnBCompanyData(BaseModel):
    """Company basic information from Nice D&B."""

    business_number: str = Field(..., description="Business registration number")
    company_name: str = Field(..., description="Company name")
    representative: Optional[str] = Field(None, description="Representative name")
    address: Optional[str] = Field(None, description="Company address")
    industry: Optional[str] = Field(None, description="Industry sector")
    established_date: Optional[date] = Field(None, description="Date of establishment")
    credit_grade: Optional[str] = Field(None, description="Credit grade (e.g., 'A+', 'A', 'B+')")
    risk_level: Optional[str] = Field(
        None, description="Risk level: 'low', 'moderate', or 'caution'"
    )
    summary: Optional[str] = Field(None, description="Company summary or evaluation")


class NiceDnBResponse(BaseModel):
    """Complete Nice D&B API response."""

    success: bool = Field(True, description="Whether the request was successful")
    data: NiceDnBCompanyData = Field(..., description="Company basic information")
    financials: List[NiceDnBFinancialData] = Field(
        default_factory=list, description="Financial data by year"
    )
    insights: List[NiceDnBInsight] = Field(
        default_factory=list, description="Business insights and metrics"
    )


















