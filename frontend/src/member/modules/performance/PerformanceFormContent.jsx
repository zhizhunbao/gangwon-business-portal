/**
 * Performance Form Content - Member Portal
 * 成果输入表单内容组件 - 包含3种输入形式（标签页）
 */

import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Card from "@shared/components/Card";
import Button from "@shared/components/Button";
import Input from "@shared/components/Input";
import Textarea from "@shared/components/Textarea";
import Select from "@shared/components/Select";
import { Tabs } from "@shared/components";
import { performanceService } from "@shared/services";
import {
  PaperclipIcon,
  DocumentIcon,
  XIcon,
  PlusIcon,
  ChartIcon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  ClipboardDocumentCheckIcon,
  SparklesIcon,
  ReportIcon,
} from "@shared/components/Icons";
import "./PerformanceFormContent.css";

export default function PerformanceFormContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("salesEmployment");
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    quarter: "",
    // 销售额雇佣
    salesEmployment: {
      sales: {
        previousYear: "",
        reportingDate: "",
      },
      export: {
        previousYear: "",
        reportingDate: "",
      },
      employment: {
        currentEmployees: {
          previousYear: "",
          reportingDate: "",
        },
        newEmployees: {
          previousYear: "",
          reportingDate: "",
        },
        totalEmployees: {
          previousYear: "",
          reportingDate: "",
        },
      },
    },
    // 政府支持受惠历史
    governmentSupport: [],
    // 知识产权
    intellectualProperty: [],
  });
  const [loading, setLoading] = useState(false);

  // Load existing record if editing
  useEffect(() => {
    if (id) {
      loadRecord();
    }
  }, [id]);

  const loadRecord = async () => {
    setLoading(true);
    try {
      const record = await performanceService.getRecord(id);
      
      // Convert backend data to frontend format
      setFormData({
        year: record.year,
        quarter: record.quarter ? record.quarter.toString() : "",
        salesEmployment: record.dataJson?.sales_employment ? {
          sales: {
            previousYear: record.dataJson.sales_employment.sales?.previous_year || "",
            reportingDate: record.dataJson.sales_employment.sales?.reporting_date || "",
          },
          export: {
            previousYear: record.dataJson.sales_employment.export?.previous_year || "",
            reportingDate: record.dataJson.sales_employment.export?.reporting_date || "",
          },
          employment: {
            currentEmployees: {
              previousYear: record.dataJson.sales_employment.employment?.current_employees?.previous_year || "",
              reportingDate: record.dataJson.sales_employment.employment?.current_employees?.reporting_date || "",
            },
            newEmployees: {
              previousYear: record.dataJson.sales_employment.employment?.new_employees?.previous_year || "",
              reportingDate: record.dataJson.sales_employment.employment?.new_employees?.reporting_date || "",
            },
            totalEmployees: {
              previousYear: record.dataJson.sales_employment.employment?.total_employees?.previous_year || "",
              reportingDate: record.dataJson.sales_employment.employment?.total_employees?.reporting_date || "",
            },
          },
        } : {
          sales: { previousYear: "", reportingDate: "" },
          export: { previousYear: "", reportingDate: "" },
          employment: {
            currentEmployees: { previousYear: "", reportingDate: "" },
            newEmployees: { previousYear: "", reportingDate: "" },
            totalEmployees: { previousYear: "", reportingDate: "" },
          },
        },
        governmentSupport: record.dataJson?.government_support?.map(item => ({
          projectName: item.project_name || "",
          startupProjectName: item.startup_project_name || "",
          startDate: item.start_date || "",
          endDate: item.end_date || "",
          supportAmount: item.support_amount?.toString() || "",
          supportOrganization: item.support_organization || "",
        })) || [],
        intellectualProperty: record.dataJson?.intellectual_property?.map(item => ({
          name: item.name || "",
          number: item.number || "",
          type: item.type || "",
          registrationType: item.registration_type || "",
          country: item.country || "",
          overseasType: item.overseas_type || "",
          registrationDate: item.registration_date || "",
          publicDisclosure: item.public_disclosure || "",
          proofDocument: null,
          proofDocumentFileId: item.proof_document_file_id || null,
        })) || [],
      });

      // Set active tab based on record type
      if (record.type === 'support') {
        setActiveTab('governmentSupport');
      } else if (record.type === 'ip') {
        setActiveTab('intellectualProperty');
      } else {
        setActiveTab('salesEmployment');
      }
    } catch (error) {
      console.error('Failed to load record:', error);
      const errorMessage = error.response?.data?.detail || error.message || t("message.loadFailed") || "加载失败";
      alert(errorMessage);
      navigate("/member/performance/list");
    } finally {
      setLoading(false);
    }
  };

  // 格式化数字（每3位加逗号）
  const formatNumber = (value) => {
    if (!value) return "";
    const num = value.toString().replace(/,/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // 解析数字（移除逗号）
  const parseNumber = (value) => {
    return value ? value.toString().replace(/,/g, "") : "";
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedChange = (path, value) => {
    setFormData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev)); // 深拷贝
      const keys = path.split(".");
      let target = newData;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]]) {
          target[keys[i]] = {};
        }
        target = target[keys[i]];
      }

      target[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const handleNumberChange = (path, value) => {
    const numValue = parseNumber(value);
    handleNestedChange(path, numValue);
  };

  // 添加政府支持记录
  const addGovernmentSupport = () => {
    setFormData((prev) => ({
      ...prev,
      governmentSupport: [
        ...prev.governmentSupport,
        {
          projectName: "",
          startupProjectName: "",
          startDate: "",
          endDate: "",
          supportAmount: "",
          supportOrganization: "",
        },
      ],
    }));
  };

  // 删除政府支持记录
  const removeGovernmentSupport = (index) => {
    setFormData((prev) => ({
      ...prev,
      governmentSupport: prev.governmentSupport.filter((_, i) => i !== index),
    }));
  };

  // 更新政府支持记录
  const updateGovernmentSupport = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      governmentSupport: prev.governmentSupport.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  // 添加知识产权记录
  const addIntellectualProperty = () => {
    setFormData((prev) => ({
      ...prev,
      intellectualProperty: [
        ...prev.intellectualProperty,
        {
          name: "",
          number: "",
          type: "",
          registrationType: "",
          country: "",
          overseasType: "",
          registrationDate: "",
          publicDisclosure: "",
          proofDocument: null,
        },
      ],
    }));
  };

  // 删除知识产权记录
  const removeIntellectualProperty = (index) => {
    setFormData((prev) => ({
      ...prev,
      intellectualProperty: prev.intellectualProperty.filter(
        (_, i) => i !== index
      ),
    }));
  };

  // 更新知识产权记录
  const updateIntellectualProperty = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      intellectualProperty: prev.intellectualProperty.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  // 处理文件上传
  const handleFileUpload = (index, file) => {
    if (file && file.type !== "application/pdf") {
      alert(t("performance.fileUploadHint", "仅支持PDF格式"));
      return;
    }
    updateIntellectualProperty(index, "proofDocument", file);
  };

  const validateForm = () => {
    if (!formData.year) {
      alert(t("validation.required", { field: t("performance.year") }));
      return false;
    }

    // Validate Government Support
    if (formData.governmentSupport.length > 0) {
      for (let i = 0; i < formData.governmentSupport.length; i++) {
        const item = formData.governmentSupport[i];
        if (
          !item.projectName ||
          !item.startupProjectName ||
          !item.startDate ||
          !item.endDate ||
          !item.supportAmount ||
          !item.supportOrganization
        ) {
          alert(
            t("validation.required", {
              field: `${t("performance.tabs.governmentSupport")} #${i + 1}`,
            })
          );
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      // Convert form data to backend format
      const backendData = performanceService.convertFormDataToBackendFormat(formData);
      
      let record;
      if (id) {
        // Update existing record
        record = await performanceService.updateRecord(id, backendData);
        // Submit for review
        record = await performanceService.submitRecord(id);
      } else {
        // Create new record and submit
        record = await performanceService.createRecord(backendData);
        record = await performanceService.submitRecord(record.id);
      }
      
      alert(t("message.submitSuccess") || "提交成功");
      navigate("/member/performance/list");
    } catch (error) {
      console.error("Failed to submit:", error);
      const errorMessage = error.response?.data?.detail || error.message || t("message.submitFailed") || "提交失败";
      alert(errorMessage);
    }
  };

  const handleSaveDraft = async () => {
    try {
      // Convert form data to backend format
      const backendData = performanceService.convertFormDataToBackendFormat(formData);
      
      if (id) {
        // Update existing draft
        await performanceService.updateRecord(id, backendData);
      } else {
        // Create new draft
        await performanceService.createRecord(backendData);
      }
      
      alert(t("message.saveSuccess") || "保存成功");
    } catch (error) {
      console.error("Failed to save draft:", error);
      const errorMessage = error.response?.data?.detail || error.message || t("message.saveFailed") || "保存失败";
      alert(errorMessage);
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  });

  const quarterOptions = [
    { value: "", label: t("performance.selectQuarter", "选择季度") },
    { value: "1", label: t("performance.quarter1", "第一季度") },
    { value: "2", label: t("performance.quarter2", "第二季度") },
    { value: "3", label: t("performance.quarter3", "第三季度") },
    { value: "4", label: t("performance.quarter4", "第四季度") },
  ];

  const tabs = [
    {
      key: "salesEmployment",
      label: t("performance.tabs.salesEmployment", "销售额雇佣"),
    },
    {
      key: "governmentSupport",
      label: t("performance.tabs.governmentSupport", "政府支持受惠历史"),
    },
    {
      key: "intellectualProperty",
      label: t("performance.tabs.intellectualProperty", "知识产权"),
    },
  ];

  // 渲染销售额雇佣标签页
  const renderSalesEmploymentTab = () => {
    const se = formData.salesEmployment;
    return (
      <div className="performance-form-tab">
        {/* 销售额 */}
        <Card className="info-card">
          <div className="card-header">
            <CurrencyDollarIcon className="section-icon" />
            <h3>{t("performance.salesEmploymentFields.sales", "销售额")}</h3>
          </div>
          <div className="form-section">
            <div className="form-group">
              <label>
                {t(
                  "performance.salesEmploymentFields.salesPerformance",
                  "销售实绩"
                )}
              </label>
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    {t(
                      "performance.salesEmploymentFields.previousYear",
                      "前一年度"
                    )}{" "}
                    ({t("performance.salesEmploymentFields.unit.won", "元")})
                  </label>
                  <Input
                    type="text"
                    value={formatNumber(se.sales.previousYear)}
                    onChange={(e) =>
                      handleNumberChange(
                        "salesEmployment.sales.previousYear",
                        e.target.value
                      )
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label>
                    {t(
                      "performance.salesEmploymentFields.reportingDate",
                      "编写基准日"
                    )}{" "}
                    ({t("performance.salesEmploymentFields.unit.won", "元")})
                  </label>
                  <Input
                    type="text"
                    value={formatNumber(se.sales.reportingDate)}
                    onChange={(e) =>
                      handleNumberChange(
                        "salesEmployment.sales.reportingDate",
                        e.target.value
                      )
                    }
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 出口额 */}
        <Card className="info-card">
          <div className="card-header">
            <ChartIcon className="section-icon" />
            <h3>{t("performance.salesEmploymentFields.export", "出口额")}</h3>
          </div>
          <div className="form-section">
            <div className="form-group">
              <label>
                {t(
                  "performance.salesEmploymentFields.exchangeRate",
                  "年报发行时汇率基准"
                )}
              </label>
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    {t(
                      "performance.salesEmploymentFields.previousYear",
                      "前一年度"
                    )}{" "}
                    ({t("performance.salesEmploymentFields.unit.won", "元")})
                  </label>
                  <Input
                    type="text"
                    value={formatNumber(se.export.previousYear)}
                    onChange={(e) =>
                      handleNumberChange(
                        "salesEmployment.export.previousYear",
                        e.target.value
                      )
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label>
                    {t(
                      "performance.salesEmploymentFields.reportingDate",
                      "编写基准日"
                    )}{" "}
                    ({t("performance.salesEmploymentFields.unit.won", "元")})
                  </label>
                  <Input
                    type="text"
                    value={formatNumber(se.export.reportingDate)}
                    onChange={(e) =>
                      handleNumberChange(
                        "salesEmployment.export.reportingDate",
                        e.target.value
                      )
                    }
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 雇佣创造 */}
        <Card className="info-card">
          <div className="card-header">
            <BriefcaseIcon className="section-icon" />
            <h3>
              {t("performance.salesEmploymentFields.employment", "雇佣创造")}
            </h3>
          </div>
          <div className="form-section">
            <div className="form-group">
              <label>
                {t(
                  "performance.salesEmploymentFields.employmentCount",
                  "雇佣人数"
                )}
              </label>

              {/* 现有员工数 */}
              <div className="form-subsection">
                <h4>
                  {t(
                    "performance.salesEmploymentFields.currentEmployees",
                    "现有员工数"
                  )}
                </h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.salesEmploymentFields.previousYear",
                        "前一年度"
                      )}{" "}
                      (
                      {t("performance.salesEmploymentFields.unit.people", "名")}
                      )
                    </label>
                    <Input
                      type="text"
                      value={formatNumber(
                        se.employment.currentEmployees.previousYear
                      )}
                      onChange={(e) =>
                        handleNumberChange(
                          "salesEmployment.employment.currentEmployees.previousYear",
                          e.target.value
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.salesEmploymentFields.reportingDate",
                        "编写基准日"
                      )}{" "}
                      (
                      {t("performance.salesEmploymentFields.unit.people", "名")}
                      )
                    </label>
                    <Input
                      type="text"
                      value={formatNumber(
                        se.employment.currentEmployees.reportingDate
                      )}
                      onChange={(e) =>
                        handleNumberChange(
                          "salesEmployment.employment.currentEmployees.reportingDate",
                          e.target.value
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* 新雇佣人数 */}
              <div className="form-subsection">
                <h4>
                  {t(
                    "performance.salesEmploymentFields.newEmployees",
                    "新雇佣人数"
                  )}
                </h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.salesEmploymentFields.previousYear",
                        "前一年度"
                      )}{" "}
                      (
                      {t("performance.salesEmploymentFields.unit.people", "名")}
                      )
                    </label>
                    <Input
                      type="text"
                      value={formatNumber(
                        se.employment.newEmployees.previousYear
                      )}
                      onChange={(e) =>
                        handleNumberChange(
                          "salesEmployment.employment.newEmployees.previousYear",
                          e.target.value
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.salesEmploymentFields.reportingDate",
                        "编写基准日"
                      )}{" "}
                      (
                      {t("performance.salesEmploymentFields.unit.people", "名")}
                      )
                    </label>
                    <Input
                      type="text"
                      value={formatNumber(
                        se.employment.newEmployees.reportingDate
                      )}
                      onChange={(e) =>
                        handleNumberChange(
                          "salesEmployment.employment.newEmployees.reportingDate",
                          e.target.value
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* 总人数 */}
              <div className="form-subsection">
                <h4>
                  {t(
                    "performance.salesEmploymentFields.totalEmployees",
                    "总人数"
                  )}
                </h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.salesEmploymentFields.previousYear",
                        "前一年度"
                      )}{" "}
                      (
                      {t("performance.salesEmploymentFields.unit.people", "名")}
                      )
                    </label>
                    <Input
                      type="text"
                      value={formatNumber(
                        se.employment.totalEmployees.previousYear
                      )}
                      onChange={(e) =>
                        handleNumberChange(
                          "salesEmployment.employment.totalEmployees.previousYear",
                          e.target.value
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.salesEmploymentFields.reportingDate",
                        "编写基准日"
                      )}{" "}
                      (
                      {t("performance.salesEmploymentFields.unit.people", "名")}
                      )
                    </label>
                    <Input
                      type="text"
                      value={formatNumber(
                        se.employment.totalEmployees.reportingDate
                      )}
                      onChange={(e) =>
                        handleNumberChange(
                          "salesEmployment.employment.totalEmployees.reportingDate",
                          e.target.value
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  // 渲染政府支持受惠历史标签页
  const renderGovernmentSupportTab = () => {
    return (
      <div className="performance-form-tab">
        <Card className="info-card">
          <div className="form-header">
            <div className="card-header">
              <SparklesIcon className="section-icon" />
              <h3>
                {t("performance.tabs.governmentSupport", "政府支持受惠历史")}
              </h3>
            </div>
            <Button
              onClick={addGovernmentSupport}
              variant="secondary"
              size="small"
            >
              <PlusIcon className="w-4 h-4 icon-with-margin" />
              {t("performance.governmentSupportFields.add", "添加")}
            </Button>
          </div>

          {formData.governmentSupport.length === 0 ? (
            <div className="empty-state">
              <p>{t("common.noData", "暂无数据")}</p>
              <p className="hint">
                {t(
                  "performance.governmentSupportFields.emptyHint",
                  '点击上方"添加"按钮添加政府支持受惠历史记录'
                )}
              </p>
            </div>
          ) : (
            formData.governmentSupport.map((item, index) => (
              <Card key={index} className="government-support-item">
                <div className="item-header">
                  <h4>
                    {t(
                      "performance.governmentSupportFields.item",
                      "政府支持项目"
                    )}{" "}
                    {index + 1}
                  </h4>
                  <Button
                    onClick={() => removeGovernmentSupport(index)}
                    variant="text"
                    size="small"
                  >
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.governmentSupportFields.projectName",
                        "执行项目名"
                      )}{" "}
                      *
                    </label>
                    <Input
                      value={item.projectName}
                      onChange={(e) =>
                        updateGovernmentSupport(
                          index,
                          "projectName",
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.governmentSupportFields.startupProjectName",
                        "创业项目名"
                      )}{" "}
                      *
                    </label>
                    <Input
                      value={item.startupProjectName}
                      onChange={(e) =>
                        updateGovernmentSupport(
                          index,
                          "startupProjectName",
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.governmentSupportFields.startDate",
                        "开始日"
                      )}{" "}
                      *
                    </label>
                    <Input
                      type="date"
                      value={item.startDate}
                      onChange={(e) =>
                        updateGovernmentSupport(
                          index,
                          "startDate",
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.governmentSupportFields.endDate",
                        "结束日"
                      )}{" "}
                      *
                    </label>
                    <Input
                      type="date"
                      value={item.endDate}
                      onChange={(e) =>
                        updateGovernmentSupport(
                          index,
                          "endDate",
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.governmentSupportFields.supportAmount",
                        "支持金额"
                      )}{" "}
                      (
                      {t(
                        "performance.governmentSupportFields.supportAmountUnit",
                        "千元"
                      )}
                      ) *
                    </label>
                    <Input
                      type="text"
                      value={formatNumber(item.supportAmount)}
                      onChange={(e) =>
                        updateGovernmentSupport(
                          index,
                          "supportAmount",
                          parseNumber(e.target.value)
                        )
                      }
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.governmentSupportFields.supportOrganization",
                        "支持机构名"
                      )}{" "}
                      *
                    </label>
                    <Input
                      value={item.supportOrganization}
                      onChange={(e) =>
                        updateGovernmentSupport(
                          index,
                          "supportOrganization",
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>
                </div>
              </Card>
            ))
          )}
        </Card>
      </div>
    );
  };

  // 渲染知识产权标签页
  const renderIntellectualPropertyTab = () => {
    const ipTypes = [
      {
        value: "patent",
        label: t("performance.intellectualPropertyFields.types.patent", "专利"),
      },
      {
        value: "trademark",
        label: t(
          "performance.intellectualPropertyFields.types.trademark",
          "商标权"
        ),
      },
      {
        value: "utility",
        label: t(
          "performance.intellectualPropertyFields.types.utility",
          "实用新型"
        ),
      },
      {
        value: "design",
        label: t("performance.intellectualPropertyFields.types.design", "设计"),
      },
      {
        value: "other",
        label: t("performance.intellectualPropertyFields.types.other", "其他"),
      },
    ];

    const registrationTypes = [
      {
        value: "application",
        label: t(
          "performance.intellectualPropertyFields.registrationTypes.application",
          "申请"
        ),
      },
      {
        value: "registered",
        label: t(
          "performance.intellectualPropertyFields.registrationTypes.registered",
          "注册"
        ),
      },
    ];

    const countries = [
      {
        value: "korea",
        label: t(
          "performance.intellectualPropertyFields.countries.korea",
          "大韩民国"
        ),
      },
      {
        value: "usa",
        label: t(
          "performance.intellectualPropertyFields.countries.usa",
          "美国"
        ),
      },
      {
        value: "uk",
        label: t("performance.intellectualPropertyFields.countries.uk", "英国"),
      },
      {
        value: "china",
        label: t(
          "performance.intellectualPropertyFields.countries.china",
          "中国"
        ),
      },
      {
        value: "japan",
        label: t(
          "performance.intellectualPropertyFields.countries.japan",
          "日本"
        ),
      },
      {
        value: "europe",
        label: t(
          "performance.intellectualPropertyFields.countries.europe",
          "欧洲"
        ),
      },
      {
        value: "other",
        label: t(
          "performance.intellectualPropertyFields.countries.other",
          "其他国家"
        ),
      },
    ];

    const overseasTypes = [
      {
        value: "domestic",
        label: t(
          "performance.intellectualPropertyFields.overseasTypes.domestic",
          "国内申请"
        ),
      },
      {
        value: "pct",
        label: t(
          "performance.intellectualPropertyFields.overseasTypes.pct",
          "PCT海外申请"
        ),
      },
      {
        value: "general",
        label: t(
          "performance.intellectualPropertyFields.overseasTypes.general",
          "一般海外申请"
        ),
      },
    ];

    return (
      <div className="performance-form-tab">
        <Card className="info-card">
          <div className="form-header">
            <div className="card-header">
              <DocumentIcon className="section-icon" />
              <h3>{t("performance.tabs.intellectualProperty", "知识产权")}</h3>
            </div>
            <Button
              onClick={addIntellectualProperty}
              variant="secondary"
              size="small"
            >
              <PlusIcon className="w-4 h-4 icon-with-margin" />
              {t("performance.governmentSupportFields.add", "添加")}
            </Button>
          </div>

          {formData.intellectualProperty.length === 0 ? (
            <div className="empty-state">
              <p>{t("common.noData", "暂无数据")}</p>
              <p className="hint">
                {t(
                  "performance.intellectualPropertyFields.emptyHint",
                  '点击上方"添加"按钮添加知识产权记录'
                )}
              </p>
            </div>
          ) : (
            formData.intellectualProperty.map((item, index) => (
              <Card key={index} className="intellectual-property-item">
                <div className="item-header">
                  <h4>
                    {t("performance.tabs.intellectualProperty", "知识产权")}{" "}
                    {index + 1}
                  </h4>
                  <Button
                    onClick={() => removeIntellectualProperty(index)}
                    variant="text"
                    size="small"
                  >
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.intellectualPropertyFields.name",
                        "知识产权名"
                      )}
                    </label>
                    <Input
                      value={item.name}
                      onChange={(e) =>
                        updateIntellectualProperty(
                          index,
                          "name",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.intellectualPropertyFields.number",
                        "知识产权号"
                      )}
                    </label>
                    <Input
                      value={item.number}
                      onChange={(e) =>
                        updateIntellectualProperty(
                          index,
                          "number",
                          e.target.value
                        )
                      }
                      placeholder="2022-174880"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.intellectualPropertyFields.type",
                        "知识产权区分"
                      )}
                    </label>
                    <Select
                      value={item.type}
                      onChange={(e) =>
                        updateIntellectualProperty(
                          index,
                          "type",
                          e.target.value
                        )
                      }
                      options={ipTypes}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.intellectualPropertyFields.registrationType",
                        "知识产权注册区分"
                      )}
                    </label>
                    <Select
                      value={item.registrationType}
                      onChange={(e) =>
                        updateIntellectualProperty(
                          index,
                          "registrationType",
                          e.target.value
                        )
                      }
                      options={registrationTypes}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.intellectualPropertyFields.country",
                        "注册国家"
                      )}
                    </label>
                    <Select
                      value={item.country}
                      onChange={(e) =>
                        updateIntellectualProperty(
                          index,
                          "country",
                          e.target.value
                        )
                      }
                      options={countries}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.intellectualPropertyFields.overseasType",
                        "海外申请区分"
                      )}
                    </label>
                    <Select
                      value={item.overseasType}
                      onChange={(e) =>
                        updateIntellectualProperty(
                          index,
                          "overseasType",
                          e.target.value
                        )
                      }
                      options={overseasTypes}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.intellectualPropertyFields.registrationDate",
                        "注册日期"
                      )}
                    </label>
                    <Input
                      type="date"
                      value={item.registrationDate}
                      onChange={(e) =>
                        updateIntellectualProperty(
                          index,
                          "registrationDate",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      {t(
                        "performance.intellectualPropertyFields.publicDisclosure",
                        "公开希望与否"
                      )}
                    </label>
                    <div className="radio-group">
                      <label>
                        <input
                          type="radio"
                          name={`publicDisclosure-${index}`}
                          value="yes"
                          checked={item.publicDisclosure === "yes"}
                          onChange={(e) =>
                            updateIntellectualProperty(
                              index,
                              "publicDisclosure",
                              e.target.value
                            )
                          }
                        />
                        {t("common.public", "公开")}
                      </label>
                      <label>
                        <input
                          type="radio"
                          name={`publicDisclosure-${index}`}
                          value="no"
                          checked={item.publicDisclosure === "no"}
                          onChange={(e) =>
                            updateIntellectualProperty(
                              index,
                              "publicDisclosure",
                              e.target.value
                            )
                          }
                        />
                        {t("common.private", "非公开")}
                      </label>
                    </div>
                  </div>
                  <div className="form-group full-width">
                    <label>
                      {t(
                        "performance.intellectualPropertyFields.proofDocument",
                        "证明材料附件"
                      )}
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) =>
                        handleFileUpload(index, e.target.files[0])
                      }
                      className="hidden-file-input"
                      id={`ip-file-${index}`}
                    />
                    <Button
                      onClick={() =>
                        document.getElementById(`ip-file-${index}`).click()
                      }
                      variant="secondary"
                      size="small"
                    >
                      <PaperclipIcon className="w-4 h-4 icon-with-margin" />
                      {t("common.upload", "上传")}
                    </Button>
                    {item.proofDocument && (
                      <div className="file-item">
                        <DocumentIcon className="w-4 h-4" />
                        <span>{item.proofDocument.name}</span>
                      </div>
                    )}
                    <small className="form-hint">
                      {t(
                        "performance.fileUploadHint",
                        "文件格式: PDF / 最大 10MB"
                      )}
                    </small>
                  </div>
                </div>
              </Card>
            ))
          )}
        </Card>
      </div>
    );
  };

  return (
    <div className="performance-form-content">
      <div className="page-header">
        <div className="page-title-wrapper">
          <ClipboardDocumentCheckIcon className="page-title-icon" />
          <h1>{t("performance.input", "成果输入")}</h1>
        </div>
      </div>

      {/* 基本信息 */}
      <Card className="info-card">
        <div className="card-header">
          <ReportIcon className="section-icon" />
          <h2>{t("performance.sections.basicInfo", "基本信息")}</h2>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>{t("performance.year", "年度")} *</label>
            <Select
              value={formData.year.toString()}
              onChange={(e) => handleChange("year", parseInt(e.target.value))}
              options={yearOptions}
              required
            />
          </div>
          <div className="form-group">
            <label>{t("performance.quarter", "季度")}</label>
            <Select
              value={formData.quarter}
              onChange={(e) => handleChange("quarter", e.target.value)}
              options={quarterOptions}
            />
            <small className="form-hint">
              {t("performance.quarterHint", "不选择季度则视为年度成果")}
            </small>
          </div>
        </div>
      </Card>

      {/* 标签页 */}
      <div className="performance-tabs-container">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        <div className="tab-content">
          {activeTab === "salesEmployment" && renderSalesEmploymentTab()}
          {activeTab === "governmentSupport" && renderGovernmentSupportTab()}
          {activeTab === "intellectualProperty" &&
            renderIntellectualPropertyTab()}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="action-buttons">
        <Button
          onClick={() => navigate("/member/performance/list")}
          variant="secondary"
        >
          {t("common.cancel", "取消")}
        </Button>

        <Button onClick={handleSaveDraft} variant="outline">
          {t("performance.saveDraft", "临时保存")}
        </Button>

        <Button onClick={handleSubmit} variant="primary">
          {t("performance.input", "成果提交")}
        </Button>
      </div>
    </div>
  );
}
