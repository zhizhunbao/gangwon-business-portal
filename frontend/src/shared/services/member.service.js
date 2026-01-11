// Member Service - 会员服务

import apiService from "./api.service";
import { API_PREFIX } from "@shared/utils/constants";
import { createService } from "@shared/utils/helpers";

// 安全解析 JSON 字符串
function safeJsonParse(value, defaultValue = null) {
  if (!value) return defaultValue;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

class MemberService {
  // 获取当前会员资料
  async getProfile() {
    const response = await apiService.get(`${API_PREFIX}/member/profile`);

    if (response) {
      return {
        id: response.id,
        businessNumber: response.business_number,
        companyName: response.company_name,
        email: response.email,
        status: response.status,
        approvalStatus: response.approval_status,
        industry: response.industry,
        sales: response.revenue ? parseFloat(response.revenue) : null,
        revenue: response.revenue ? parseFloat(response.revenue) : null,
        employeeCount: response.employee_count,
        establishedDate: response.founding_date,
        foundingDate: response.founding_date,
        region: response.region,
        address: response.address,
        website: response.website,
        websiteUrl: response.website,
        logo: response.logo_url,
        logoUrl: response.logo_url,
        phone: response.phone,
        representative: response.representative,
        representativeBirthDate: response.representative_birth_date,
        representativeGender: response.representative_gender,
        corporationNumber: response.legal_number,
        createdAt: response.created_at,
        updatedAt: response.updated_at,
        contactPersonName: response.contact_person_name,
        contactPersonDepartment: response.contact_person_department,
        contactPersonPosition: response.contact_person_position,
        mainBusiness: response.main_business,
        description: response.description,
        cooperationFields: safeJsonParse(response.cooperation_fields, []),
        startupType: response.startup_type,
        ksicMajor: response.ksic_major,
        ksicSub: response.ksic_sub,
        category: response.category,
        participationPrograms: safeJsonParse(response.participation_programs, []),
        investmentStatus: safeJsonParse(response.investment_status, null),
      };
    }

    return null;
  }

  // 验证公司信息
  async verifyCompany(data) {
    const requestData = {
      business_number: data.businessNumber?.replace(/-/g, ""),
      company_name: data.companyName ?? null,
    };

    return await apiService.post(`${API_PREFIX}/members/verify-company`, requestData);
  }

  // 更新当前会员资料
  async updateProfile(data) {
    const requestData = {};

    if (data.companyName !== undefined) requestData.company_name = data.companyName || null;
    if (data.email !== undefined) requestData.email = data.email || null;
    if (data.industry !== undefined) requestData.industry = data.industry || null;
    if (data.revenue !== undefined) requestData.revenue = data.revenue || null;
    if (data.employeeCount !== undefined) requestData.employee_count = data.employeeCount || null;
    if (data.foundingDate !== undefined) requestData.founding_date = data.foundingDate || null;
    if (data.region !== undefined) requestData.region = data.region || null;
    if (data.address !== undefined) requestData.address = data.address || null;
    if (data.website !== undefined) requestData.website = data.website || null;
    if (data.phone !== undefined) requestData.phone = data.phone || null;
    if (data.logoUrl !== undefined) requestData.logo_url = data.logoUrl || null;
    if (data.representative !== undefined) requestData.representative = data.representative || null;
    if (data.representativeBirthDate !== undefined) requestData.representative_birth_date = data.representativeBirthDate || null;
    if (data.representativeGender !== undefined) requestData.representative_gender = data.representativeGender || null;
    if (data.corporationNumber !== undefined) requestData.corporation_number = data.corporationNumber || null;
    if (data.contactPersonName !== undefined) requestData.contact_person_name = data.contactPersonName || null;
    if (data.contactPersonDepartment !== undefined) requestData.contact_person_department = data.contactPersonDepartment || null;
    if (data.contactPersonPosition !== undefined) requestData.contact_person_position = data.contactPersonPosition || null;
    if (data.mainBusiness !== undefined) requestData.main_business = data.mainBusiness || null;
    if (data.description !== undefined) requestData.description = data.description || null;
    if (data.cooperationFields !== undefined) requestData.cooperation_fields = JSON.stringify(data.cooperationFields);
    if (data.startupType !== undefined) requestData.startup_type = data.startupType || null;
    if (data.ksicMajor !== undefined) requestData.ksic_major = data.ksicMajor || null;
    if (data.ksicSub !== undefined) requestData.ksic_sub = data.ksicSub || null;
    if (data.category !== undefined) requestData.category = data.category || null;
    if (data.participationPrograms !== undefined) requestData.participation_programs = JSON.stringify(data.participationPrograms);
    if (data.investmentStatus !== undefined) requestData.investment_status = JSON.stringify(data.investmentStatus);

    const response = await apiService.put(`${API_PREFIX}/member/profile`, requestData);

    if (response) {
      return {
        id: response.id,
        businessNumber: response.business_number,
        companyName: response.company_name,
        email: response.email,
        status: response.status,
        approvalStatus: response.approval_status,
        industry: response.industry,
        sales: response.revenue ? parseFloat(response.revenue) : null,
        revenue: response.revenue ? parseFloat(response.revenue) : null,
        employeeCount: response.employee_count,
        establishedDate: response.founding_date,
        foundingDate: response.founding_date,
        region: response.region,
        address: response.address,
        website: response.website,
        websiteUrl: response.website,
        logo: response.logo_url,
        logoUrl: response.logo_url,
        phone: response.phone,
        representative: response.representative,
        representativeBirthDate: response.representative_birth_date,
        representativeGender: response.representative_gender,
        corporationNumber: response.corporation_number || response.legal_number,
        createdAt: response.created_at,
        updatedAt: response.updated_at,
        contactPersonName: response.contact_person_name,
        contactPersonDepartment: response.contact_person_department,
        contactPersonPosition: response.contact_person_position,
        mainBusiness: response.main_business,
        description: response.description,
        cooperationFields: safeJsonParse(response.cooperation_fields, []),
        startupType: response.startup_type,
        ksicMajor: response.ksic_major,
        ksicSub: response.ksic_sub,
        category: response.category,
        participationPrograms: safeJsonParse(response.participation_programs, []),
        investmentStatus: safeJsonParse(response.investment_status, null),
      };
    }

    return null;
  }
}

export default createService(MemberService);
