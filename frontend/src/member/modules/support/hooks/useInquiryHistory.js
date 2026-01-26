/**
 * 咨询历史业务逻辑 Hook
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supportService } from "../services/support.service";

/**
 * 咨询历史逻辑控制 Hook
 */
export function useInquiryHistory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [allThreads, setAllThreads] = useState([]);
  const [filteredThreads, setFilteredThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  const handleFilterChange = useCallback((filtered) => {
    setFilteredThreads(filtered);
  }, []);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const response = await supportService.getMemberThreads({
        page: 1,
        pageSize: 1000,
        status: statusFilter || undefined,
      });
      setAllThreads(response.items || []);
      setFilteredThreads(response.items || []);
    } catch (error) {
      console.error("Failed to load threads:", error);
      setAllThreads([]);
      setFilteredThreads([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const openDetailModal = (threadId) => {
    setSelectedThreadId(threadId);
  };

  const closeDetailModal = () => {
    setSelectedThreadId(null);
    loadThreads();
  };

  return {
    allThreads,
    filteredThreads,
    loading,
    selectedThreadId,
    statusFilter,
    setStatusFilter,
    handleFilterChange,
    openDetailModal,
    closeDetailModal,
    loadThreads,
    navigate,
  };
}
