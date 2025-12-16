"""
Dashboard service.

Business logic for dashboard statistics aggregation.
"""
from typing import Optional
from decimal import Decimal

from ...common.modules.supabase.service import supabase_service


class DashboardService:
    """Dashboard service class."""

    async def get_dashboard_stats(
        self,
        year: Optional[str] = None,
        quarter: Optional[str] = None,
    ) -> dict:
        """
        Get dashboard statistics aggregated from members and performance records.

        Args:
            year: Year filter ('all' or specific year as string)
            quarter: Quarter filter ('all', 'Q1', 'Q2', 'Q3', 'Q4')

        Returns:
            Dictionary with stats and chartData
        """
        # Parse year and quarter
        year_int = None
        if year and year != "all":
            try:
                year_int = int(year)
            except ValueError:
                year_int = None

        quarter_int = None
        if quarter and quarter != "all":
            if quarter.startswith("Q"):
                try:
                    quarter_int = int(quarter[1:])
                except ValueError:
                    quarter_int = None

        # 1. Get total approved members count
        total_members = await supabase_service.get_approved_members_count()

        # 2. Get performance records with filters
        # Only count approved records
        performance_records = await supabase_service.get_performance_records(
            year=year_int,
            quarter=quarter_int,
            status="approved"
        )

        # 3. Aggregate statistics from performance records
        total_sales = Decimal("0")
        total_employment = 0
        total_ip = 0

        for record in performance_records:
            data_json = record.get("data_json") or {}

            # Aggregate sales from 'sales' type records
            if record.get("type") == "sales":
                # Try different possible field names for sales revenue
                sales_value = (
                    data_json.get("salesRevenue")
                    or data_json.get("revenue")
                    or data_json.get("totalSales")
                    or data_json.get("sales")
                    or 0
                )
                if isinstance(sales_value, (int, float)):
                    total_sales += Decimal(str(sales_value))

            # Aggregate employment from 'support' type records
            if record.get("type") == "support":
                # Try different possible field names for employment
                employment_value = (
                    data_json.get("newHires")
                    or data_json.get("employment")
                    or data_json.get("employeeCount")
                    or data_json.get("newEmployees")
                    or 0
                )
                if isinstance(employment_value, (int, float)):
                    total_employment += int(employment_value)

            # Aggregate IP from 'ip' type records
            if record.get("type") == "ip":
                ip_data = data_json.get("intellectualProperty") or data_json.get("ip") or []
                if isinstance(ip_data, list):
                    total_ip += len(ip_data)
                elif isinstance(ip_data, (int, float)):
                    total_ip += int(ip_data)

        # 4. Generate chart data
        chart_data = await self._generate_chart_data(
            year_int, quarter_int
        )

        return {
            "stats": {
                "totalMembers": total_members,
                "totalSales": total_sales,
                "totalEmployment": total_employment,
                "totalIntellectualProperty": total_ip,
            },
            "chartData": chart_data,
        }

    async def _generate_chart_data(
        self,
        year_filter: Optional[int],
        quarter_filter: Optional[int],
    ) -> dict:
        """
        Generate chart data for dashboard.

        Args:
            year_filter: Year to filter by (None for all)
            quarter_filter: Quarter to filter by (None for all)

        Returns:
            Dictionary with members and salesEmployment chart data
        """
        # Get all approved performance records for chart data
        # We need to show trends, so we get records even if they don't match the filter
        # but we'll group them by period
        performance_records = await supabase_service.get_performance_records_for_chart(
            year_filter=year_filter
        )

        # Group by period (year-quarter)
        period_data = {}

        for record in performance_records:
            # Skip if quarter filter is specified and doesn't match
            if quarter_filter and record.get("quarter") != quarter_filter:
                continue

            period_key = f"{record.get('year')}-{record.get('quarter') or 'A'}"
            if period_key not in period_data:
                period_data[period_key] = {
                    "year": record.get("year"),
                    "quarter": record.get("quarter"),
                    "sales": Decimal("0"),
                    "employment": 0,
                    "members": set(),
                }

            period_data[period_key]["members"].add(record.get("member_id"))

            data_json = record.get("data_json") or {}

            # Aggregate sales
            if record.get("type") == "sales":
                sales_value = (
                    data_json.get("salesRevenue")
                    or data_json.get("revenue")
                    or data_json.get("totalSales")
                    or data_json.get("sales")
                    or 0
                )
                if isinstance(sales_value, (int, float)):
                    period_data[period_key]["sales"] += Decimal(str(sales_value))

            # Aggregate employment
            if record.get("type") == "support":
                employment_value = (
                    data_json.get("newHires")
                    or data_json.get("employment")
                    or data_json.get("employeeCount")
                    or data_json.get("newEmployees")
                    or 0
                )
                if isinstance(employment_value, (int, float)):
                    period_data[period_key]["employment"] += int(employment_value)

        # Convert to sorted list
        chart_items = []
        for key, data in period_data.items():
            period_label = (
                f"{data['year']} Q{data['quarter']}"
                if data["quarter"]
                else f"{data['year']} Annual"
            )
            chart_items.append(
                {
                    "period": period_label,
                    "year": data["year"],
                    "quarter": data["quarter"],
                    "members": len(data["members"]),
                    "sales": data["sales"],
                    "employment": data["employment"],
                }
            )

        # Sort by year and quarter
        chart_items.sort(key=lambda x: (x["year"], x["quarter"] or 999))

        # Format for response
        members_chart = [
            {"period": item["period"], "value": float(item["members"])}
            for item in chart_items
        ]

        sales_employment_chart = [
            {
                "period": item["period"],
                "sales": item["sales"],
                "employment": item["employment"],
            }
            for item in chart_items
        ]

        return {
            "members": members_chart,
            "salesEmployment": sales_employment_chart,
        }

    async def export_dashboard_data(
        self,
        year: Optional[str] = None,
        quarter: Optional[str] = None,
    ) -> list[dict]:
        """
        Export dashboard statistics data for download.

        Args:
            year: Year filter ('all' or specific year as string)
            quarter: Quarter filter ('all', 'Q1', 'Q2', 'Q3', 'Q4')

        Returns:
            List of dictionaries with dashboard statistics (raw data from database)
        """
        # Get dashboard stats
        stats_data = await self.get_dashboard_stats(year=year, quarter=quarter)
        
        # Export raw statistics data
        export_data = [
            {
                "totalMembers": stats_data["stats"]["totalMembers"],
                "totalSales": float(stats_data["stats"]["totalSales"]),
                "totalEmployment": stats_data["stats"]["totalEmployment"],
                "totalIntellectualProperty": stats_data["stats"]["totalIntellectualProperty"],
            }
        ]
        
        # Add chart data if available
        if stats_data.get("chartData"):
            chart_data = stats_data["chartData"]
            
            # Add members chart data
            if chart_data.get("members"):
                for item in chart_data["members"]:
                    export_data.append({
                        "period": item["period"],
                        "members": item["value"],
                        "sales": None,
                        "employment": None,
                    })
            
            # Add sales and employment chart data
            if chart_data.get("salesEmployment"):
                for item in chart_data["salesEmployment"]:
                    export_data.append({
                        "period": item["period"],
                        "members": None,
                        "sales": float(item["sales"]) if isinstance(item["sales"], Decimal) else item["sales"],
                        "employment": item["employment"],
                    })
        
        return export_data

