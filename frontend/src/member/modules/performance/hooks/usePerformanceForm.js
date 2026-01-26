/**
 * Performance Form Hook
 *
 * 处理成果表单的业务逻辑。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@shared/hooks";
import { useUpload } from "@shared/hooks";
import { performanceService } from "../services/performance.service";

export const usePerformanceForm = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("salesEmployment");
  const [submitConfirm, setSubmitConfirm] = useState({ open: false });

  const { uploading, uploadAttachments } = useUpload();

  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    quarter: "",
    salesEmployment: {
      sales: { previousYear: "", currentYear: "", reportingDate: "" },
      export: {
        previousYear: "",
        currentYear: "",
        reportingDate: "",
        hskCode: "",
        exportCountry1: "",
        exportCountry2: "",
      },
      employment: {
        currentEmployees: { previousYear: "", currentYear: "" },
        newEmployees: { previousYear: "", currentYear: "" },
        totalEmployees: { previousYear: "", currentYear: "" },
      },
      attachments: [],
    },
    governmentSupport: [],
    intellectualProperty: [],
    notes: "",
  });

  const loadRecord = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const record = await performanceService.getRecord(id);

      if (record) {
        const dataJson =
          typeof record.dataJson === "string"
            ? JSON.parse(record.dataJson)
            : record.dataJson || {};

        const salesEmploymentData = dataJson.salesEmployment
          ? { ...dataJson.salesEmployment }
          : { ...formData.salesEmployment };

        if (record.hskCode || record.exportCountry1 || record.exportCountry2) {
          if (!salesEmploymentData.export) {
            salesEmploymentData.export = {};
          }
          if (record.hskCode) {
            salesEmploymentData.export.hskCode = record.hskCode;
          }
          if (record.exportCountry1) {
            salesEmploymentData.export.exportCountry1 = record.exportCountry1;
          }
          if (record.exportCountry2) {
            salesEmploymentData.export.exportCountry2 = record.exportCountry2;
          }
        }

        const governmentSupportData = dataJson.governmentSupport
          ? dataJson.governmentSupport.map((item) => ({
              ...item,
              attachments: item.attachments || [],
            }))
          : [];

        const intellectualPropertyData = dataJson.intellectualProperty
          ? dataJson.intellectualProperty.map((item) => ({
              ...item,
              attachments: item.attachments || [],
            }))
          : [];

        if (!salesEmploymentData.attachments) {
          salesEmploymentData.attachments = [];
        }

        setFormData({
          year: record.year,
          quarter: record.quarter ? record.quarter.toString() : "",
          salesEmployment: salesEmploymentData,
          governmentSupport: governmentSupportData,
          intellectualProperty: intellectualPropertyData,
          notes: dataJson.notes || "",
        });
      }
    } catch (error) {
      console.error("Load record failed:", error);
    } finally {
      setLoading(false);
    }
  }, [id, formData.salesEmployment]);

  useEffect(() => {
    if (id && isAuthenticated) {
      loadRecord();
    }
  }, [id, isAuthenticated, i18n.language]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedChange = (path, value) => {
    setFormData((prev) => {
      const newData = { ...prev };
      const keys = path.split(".");
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]] = { ...current[keys[i]] };
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const backendData =
        performanceService.convertFormDataToBackendFormat(formData);

      if (id) {
        await performanceService.updateRecord(id, backendData);
      } else {
        await performanceService.createRecord(backendData);
      }

      setSaving(false);
      navigate("/member/performance/list");
    } catch (error) {
      setSaving(false);
      console.error("Save draft failed:", error);
    }
  };

  const confirmSubmit = async () => {
    setSaving(true);
    try {
      const backendData =
        performanceService.convertFormDataToBackendFormat(formData);
      let recordId = id;

      if (!recordId) {
        const created = await performanceService.createRecord(backendData);
        recordId = created.id;
      } else {
        await performanceService.updateRecord(recordId, backendData);
      }

      await performanceService.submitRecord(recordId);
      setSaving(false);
      setSubmitConfirm({ open: false });
      navigate("/member/performance/list");
    } catch (error) {
      setSaving(false);
      console.error("Submit failed:", error);
    }
  };

  return {
    id,
    formData,
    setFormData,
    loading,
    saving,
    activeTab,
    setActiveTab,
    submitConfirm,
    setSubmitConfirm,
    uploading,
    uploadAttachments,
    handleChange,
    handleNestedChange,
    handleSaveDraft,
    confirmSubmit,
    navigate,
  };
};
