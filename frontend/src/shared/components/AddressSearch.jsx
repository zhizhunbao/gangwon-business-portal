/**
 * Address Search Component
 * 地址搜索组件 - 集成韩国地址搜索 API (Daum Postcode)
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './AddressSearch.css';

/**
 * 地址搜索组件
 * @param {Object} props
 * @param {string} props.value - 当前地址值
 * @param {Function} props.onSelect - 地址选择回调 (address: string, zonecode: string) => void
 * @param {string} props.className - 额外 CSS 类名
 * @param {boolean} props.disabled - 是否禁用
 */
export function AddressSearch({ value, onSelect, className = '', disabled = false }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);
  const postcodeRef = useRef(null);

  useEffect(() => {
    // 加载 Daum Postcode API 脚本
    if (!window.daum) {
      loadDaumPostcodeScript();
    }
  }, []);

  /**
   * 加载 Daum Postcode API 脚本
   */
  const loadDaumPostcodeScript = () => {
    if (document.getElementById('daum-postcode-script')) {
      return; // 脚本已加载
    }

    const script = document.createElement('script');
    script.id = 'daum-postcode-script';
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    script.onload = () => {
      console.log('Daum Postcode API loaded');
    };
    script.onerror = () => {
      console.error('Failed to load Daum Postcode API');
    };
    document.head.appendChild(script);
  };

  /**
   * 打开地址搜索弹窗
   */
  const openAddressSearch = () => {
    if (disabled || isLoading) return;

    if (!window.daum || !window.daum.Postcode) {
      // 如果 API 未加载，尝试重新加载
      loadDaumPostcodeScript();
      alert(t('auth.addressApiLoading', '地址搜索 API 正在加载中，请稍候再试'));
      return;
    }

    setIsLoading(true);

    // 创建新的 Postcode 实例
    const postcode = new window.daum.Postcode({
      oncomplete: (data) => {
        // 地址选择完成
        setIsLoading(false);

        // 构建完整地址
        let fullAddress = data.address; // 用户选择的地址
        let extraAddress = ''; // 参考信息

        // 用户选择类型为 R(도로명주소) 时
        if (data.userSelectedType === 'R') {
          // 법정동명이 있을 경우 추가
          if (data.bname !== '') {
            extraAddress += data.bname;
          }
          // 건물명이 있을 경우 추가
          if (data.buildingName !== '') {
            extraAddress += extraAddress !== '' ? ', ' + data.buildingName : data.buildingName;
          }
          // 조합된 참고항목을 해당 필드에 넣는다
          if (extraAddress !== '') {
            fullAddress += ' (' + extraAddress + ')';
          }
        }

        // 调用回调函数
        if (onSelect) {
          onSelect(fullAddress, data.zonecode);
        }
      },
      onresize: (size) => {
        // 弹窗大小调整
        if (postcodeRef.current) {
          postcodeRef.current.style.width = size.width + 'px';
          postcodeRef.current.style.height = size.height + 'px';
        }
      },
      width: '100%',
      height: '100%'
    });

    // 创建弹窗容器
    if (!postcodeRef.current) {
      const wrapper = document.createElement('div');
      wrapper.className = 'address-search-popup-wrapper';
      wrapper.id = 'daum-postcode-wrapper';
      document.body.appendChild(wrapper);
      postcodeRef.current = wrapper;
    }

    // 打开弹窗
    postcode.embed(postcodeRef.current);

    // 关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.className = 'address-search-close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => {
      if (postcodeRef.current) {
        postcodeRef.current.remove();
        postcodeRef.current = null;
      }
      setIsLoading(false);
    };
    postcodeRef.current.appendChild(closeBtn);
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (postcodeRef.current) {
        postcodeRef.current.remove();
        postcodeRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`address-search-container ${className}`}>
      <div className="address-search-input-wrapper">
        <input
          type="text"
          value={value || ''}
          readOnly
          className="address-search-input"
          placeholder={t('auth.addressPlaceholder', '주소를 검색하세요')}
          disabled={disabled}
        />
        <button
          type="button"
          className="address-search-button"
          onClick={openAddressSearch}
          disabled={disabled || isLoading}
        >
          {isLoading ? t('common.loading', '로딩 중...') : t('auth.searchAddress', '주소 검색')}
        </button>
      </div>
    </div>
  );
}

export default AddressSearch;
