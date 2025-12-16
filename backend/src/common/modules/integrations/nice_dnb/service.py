"""
Nice D&B API client service.

Handles communication with the Nice D&B Open API for company information
verification and search.

OAuth 2.0 Authentication:
- Uses Client Credentials Grant flow
- Documentation: https://openapi.nicednb.com/#/guide/common/oauth
"""
import httpx
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from ...config.settings import settings
from ...logger import logger
from .schemas import NiceDnBResponse, NiceDnBCompanyData, NiceDnBFinancialData, NiceDnBInsight


class NiceDnBClient:
    """
    Nice D&B API client.

    Provides methods to search and verify company information using
    the Nice D&B Open API with OAuth 2.0 authentication.
    """

    def __init__(self):
        """Initialize Nice D&B API client."""
        self.api_key = settings.NICE_DNB_API_KEY
        self.api_secret_key = settings.NICE_DNB_API_SECRET_KEY
        # API base URL from official documentation: https://gate.nicednb.com
        # OAuth documentation: https://openapi.nicednb.com/#/guide/common/oauth
        self.base_url = settings.NICE_DNB_API_URL or "https://gate.nicednb.com"
        self.timeout = 30.0  # Request timeout in seconds
        
        # OAuth token cache
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    def _is_configured(self) -> bool:
        """Check if API key and secret key are configured."""
        return (
            self.api_key is not None
            and self.api_key != ""
            and self.api_secret_key is not None
            and self.api_secret_key != ""
        )

    async def _get_access_token(self) -> Optional[str]:
        """
        Get OAuth 2.0 access token using Client Credentials Grant flow.
        
        Implements token caching to avoid unnecessary token requests.
        Token is refreshed if expired or about to expire within 5 minutes.
        
        Returns:
            Access token string, or None if authentication fails
            
        Reference:
            OAuth documentation: https://openapi.nicednb.com/#/guide/common/oauth
        """
        # Check if we have a valid cached token
        if (
            self._access_token
            and self._token_expires_at
            and datetime.now() < (self._token_expires_at - timedelta(minutes=5))
        ):
            return self._access_token
        
        if not self._is_configured():
            return None
        
        try:
            # OAuth 2.0 Client Credentials Grant
            # Use endpoint from settings if configured, otherwise use default
            token_url = settings.NICE_DNB_OAUTH_TOKEN_ENDPOINT
            if not token_url:
                # Fallback to default endpoint if not configured
                token_url = f"{self.base_url}/nice/oauth/v1.0/accesstoken"
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # OAuth 2.0 Client Credentials Grant request
                # Using JSON body as per Nice D&B API specification
                response = await client.post(
                    token_url,
                    json={
                        "appKey": self.api_key,
                        "appSecret": self.api_secret_key,
                        "grantType": "client_credentials",
                        "scope": "oob",
                    },
                    headers={
                        "Content-Type": "application/json; charset=UTF-8",
                        "Accept": "application/json",
                    },
                )
                response.raise_for_status()
                
                token_data = response.json()
                
                # Extract access token and expiration
                # Nice D&B uses "accessToken" (camelCase), not "access_token"
                self._access_token = token_data.get("accessToken")
                
                # Calculate expiration time
                expires_in = token_data.get("expiresIn", 3600)  # Default to 1 hour
                self._token_expires_at = datetime.now() + timedelta(seconds=expires_in)
                
                return self._access_token
                
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Nice D&B OAuth token request failed with status {e.response.status_code}",
                extra={
                    "error_type": "HTTPStatusError",
                    "status_code": e.response.status_code,
                    "response_text": e.response.text[:500] if e.response.text else None,
                    "token_url": token_url,
                },
                exc_info=True,
            )
            return None
        except httpx.RequestError as e:
            logger.error(
                f"Nice D&B OAuth token request failed: {str(e)}",
                extra={
                    "error_type": "RequestError",
                    "token_url": token_url,
                },
                exc_info=True,
            )
            return None
        except Exception as e:
            logger.error(
                f"Nice D&B OAuth token request failed with unexpected error: {str(e)}",
                extra={
                    "error_type": type(e).__name__,
                    "token_url": token_url,
                },
                exc_info=True,
            )
            return None
    
    def _get_headers(self, access_token: Optional[str] = None) -> Dict[str, str]:
        """
        Get HTTP headers for API requests with OAuth 2.0 Bearer token.
        
        Args:
            access_token: OAuth access token. If not provided, will attempt to use cached token.
        
        Returns:
            Dictionary of HTTP headers
        """
        headers = {
            "Content-Type": "application/json; charset=UTF-8",
            "Accept": "application/json",
        }
        
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        elif self._access_token:
            headers["Authorization"] = f"Bearer {self._access_token}"
        
        return headers

    async def search_company(
        self, business_number: str
    ) -> Optional[NiceDnBResponse]:
        """
        Search for company information by business registration number.

        Args:
            business_number: Business registration number (사업자등록번호)

        Returns:
            NiceDnBResponse if successful, None if API is not configured or request fails

        Raises:
            Exception: If API call fails and error handling is needed
        """
        if not self._is_configured():
            return None

        # Clean business number (remove hyphens if present)
        business_number = business_number.replace("-", "").strip()

        if not business_number:
            return None

        # Use endpoint from settings if configured
        api_url = settings.NICE_DNB_COMPANY_INFO_ENDPOINT
        if not api_url:
            logger.error(
                "NICE_DNB_COMPANY_INFO_ENDPOINT is not configured in settings",
                extra={"business_number": business_number}
            )
            return None

        # Get OAuth access token
        access_token = await self._get_access_token()
        if not access_token:
            return None

        # Try POST method first (certification endpoint typically uses POST)
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Try POST with JSON body
                response = await client.post(
                    api_url,
                    headers=self._get_headers(access_token),
                    json={"bizNo": business_number},
                )
                response.raise_for_status()

                data = response.json()
                
                logger.info(
                    f"Nice D&B API request succeeded with endpoint: {api_url}",
                    extra={
                        "business_number": business_number,
                        "api_url": api_url,
                        "method": "POST",
                        "response_data": str(data)[:500],  # Log first 500 chars of response
                    }
                )

                return self._parse_response(data, business_number)
                
        except httpx.HTTPStatusError as e:
            # If POST returns 405, try GET method
            if e.response.status_code == 405:
                try:
                    async with httpx.AsyncClient(timeout=self.timeout) as client:
                        response = await client.get(
                            api_url,
                            headers=self._get_headers(access_token),
                            params={"bizNo": business_number},
                        )
                        response.raise_for_status()

                        data = response.json()
                        
                        logger.info(
                            f"Nice D&B API request succeeded with endpoint: {api_url}",
                            extra={
                                "business_number": business_number,
                                "api_url": api_url,
                                "method": "GET",
                                "response_data": str(data)[:500],  # Log first 500 chars of response
                            }
                        )

                        return self._parse_response(data, business_number)
                except httpx.HTTPStatusError as get_error:
                    logger.error(
                        f"Nice D&B API request failed with status {get_error.response.status_code}",
                        extra={
                            "error_type": "HTTPStatusError",
                            "status_code": get_error.response.status_code,
                            "response_text": get_error.response.text[:500] if get_error.response.text else None,
                            "business_number": business_number,
                            "api_url": api_url,
                            "method": "GET",
                        },
                        exc_info=True,
                    )
                    return None
            else:
                # For other HTTP errors, log and return None
                logger.error(
                    f"Nice D&B API request failed with status {e.response.status_code}",
                    extra={
                        "error_type": "HTTPStatusError",
                        "status_code": e.response.status_code,
                        "response_text": e.response.text[:500] if e.response.text else None,
                        "business_number": business_number,
                        "api_url": api_url,
                        "method": "POST",
                    },
                    exc_info=True,
                )
                return None
        except httpx.RequestError as e:
            # Network errors should be logged and return None
            logger.error(
                f"Nice D&B API request failed: {str(e)}",
                extra={
                    "error_type": "RequestError",
                    "business_number": business_number,
                    "api_url": api_url,
                },
                exc_info=True,
            )
            return None
        except Exception as e:
            # Unexpected errors
            logger.error(
                f"Nice D&B API request failed with unexpected error: {str(e)}",
                extra={
                    "error_type": type(e).__name__,
                    "business_number": business_number,
                    "api_url": api_url,
                },
                exc_info=True,
            )
            return None

    def _parse_response(
        self, api_data: Dict[str, Any], business_number: str
    ) -> NiceDnBResponse:
        """
        Parse API response into NiceDnBResponse schema.

        Args:
            api_data: Raw API response data (contains dataHeader and dataBody)
            business_number: Business registration number used in the query

        Returns:
            Parsed NiceDnBResponse object

        Note:
            API response format according to documentation:
            {
                "dataHeader": {...},
                "dataBody": {...}
            }
        """
        # Extract dataBody from response (according to API documentation)
        data_body = api_data.get("dataBody", {})
        
        # If dataBody is empty or not found, try using api_data directly (for backward compatibility)
        if not data_body:
            data_body = api_data

        # Log the bizNo from API response for debugging
        api_biz_no = data_body.get("bizNo")
        logger.info(
            f"Parsing Nice D&B API response",
            extra={
                "query_business_number": business_number,
                "api_biz_no": api_biz_no,
                "data_body_keys": list(data_body.keys())[:10] if isinstance(data_body, dict) else None,
            }
        )

        # Extract company basic information
        # Based on actual API response fields: cmpNm, ceoNm, addr, indNm, etc.
        company_data = NiceDnBCompanyData(
            business_number=api_biz_no if api_biz_no else business_number,
            company_name=(
                data_body.get("cmpNm")  # Korean company name (회사명)
                or data_body.get("cmpEnm")  # English company name
                or data_body.get("company_name") 
                or data_body.get("name") 
                or data_body.get("corpNm") 
                or data_body.get("corpName")
                or data_body.get("bzmnNm")
                or ""
            ),
            representative=(
                data_body.get("ceoNm")  # CEO name (대표자명)
                or data_body.get("representative") 
                or data_body.get("ceo") 
                or ""
            ),
            address=(
                data_body.get("addr")  # Address (주소)
                or data_body.get("address") 
                or data_body.get("location") 
                or ""
            ),
            industry=(
                data_body.get("indNm")  # Industry name (업종명)
                or data_body.get("indutyNm")
                or data_body.get("industry") 
                or data_body.get("sector") 
                or ""
            ),
            established_date=self._parse_date(
                data_body.get("estbDt")  # Establishment date (설립일자)
                or data_body.get("established_date") 
                or data_body.get("founding_date")
            ),
            credit_grade=(
                data_body.get("crcdGrade")  # Credit grade (신용등급)
                or data_body.get("credit_grade") 
                or data_body.get("rating") 
                or ""
            ),
            risk_level=(
                data_body.get("risk_level") 
                or data_body.get("risk") 
                or ""
            ),
            summary=(
                data_body.get("summary") 
                or data_body.get("evaluation") 
                or ""
            ),
        )

        # Extract financial data
        financials = []
        financial_list = data_body.get("financials") or data_body.get("financial_data") or []
        for financial in financial_list:
            financials.append(
                NiceDnBFinancialData(
                    year=financial.get("year") or financial.get("fiscal_year"),
                    revenue=financial.get("revenue") or financial.get("sales") or 0,
                    profit=financial.get("profit") or financial.get("net_income") or 0,
                    employees=financial.get("employees") or financial.get("employee_count") or 0,
                )
            )

        # Extract insights
        insights = []
        insights_list = data_body.get("insights") or data_body.get("metrics") or []
        for insight in insights_list:
            insights.append(
                NiceDnBInsight(
                    label=insight.get("label") or insight.get("name"),
                    value=insight.get("value") or str(insight.get("value", "")),
                    trend=insight.get("trend") or "steady",
                )
            )

        return NiceDnBResponse(
            success=True,
            data=company_data,
            financials=financials,
            insights=insights,
        )

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime.date]:
        """
        Parse date string to date object.

        Args:
            date_str: Date string in various formats

        Returns:
            Parsed date object or None if parsing fails
        """
        if not date_str:
            return None

        # Try common date formats
        date_formats = [
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%Y.%m.%d",
            "%Y%m%d",
        ]

        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue

        return None

    async def verify_company(
        self, business_number: str, company_name: Optional[str] = None
    ) -> bool:
        """
        Verify if a company exists and matches the provided information.

        Args:
            business_number: Business registration number
            company_name: Optional company name to verify against

        Returns:
            True if company is verified, False otherwise
        """
        response = await self.search_company(business_number)
        if not response or not response.success:
            return False

        if company_name:
            # Case-insensitive comparison
            return (
                response.data.company_name.lower().strip()
                == company_name.lower().strip()
            )

        return True


# Global client instance
nice_dnb_client = NiceDnBClient()

