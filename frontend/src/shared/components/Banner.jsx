/**
 * Banner Component - Generic
 * 通用横幅组件 - 支持轮播、自动切换、点击跳转等功能
 */

import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { contentService, loggerService, exceptionService } from '@shared/services';
import { BANNER_TYPES, ROUTES } from '@shared/utils/constants';
import './Banner.css';

// Banner 数据缓存 - 在模块级别缓存，避免重复请求
const bannerCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// 路由到横幅类型的映射
const ROUTE_TO_BANNER_TYPE = {
  [ROUTES.MEMBER_HOME]: BANNER_TYPES.MAIN_PRIMARY,
  [ROUTES.MEMBER_ABOUT]: BANNER_TYPES.ABOUT,
  [ROUTES.MEMBER_PROJECTS]: BANNER_TYPES.PROJECTS,
  [ROUTES.MEMBER_PERFORMANCE]: BANNER_TYPES.PERFORMANCE,
  [ROUTES.MEMBER_SUPPORT]: BANNER_TYPES.SUPPORT,
  [ROUTES.MEMBER_PROFILE]: BANNER_TYPES.PROFILE,
  [ROUTES.MEMBER_NOTICES]: BANNER_TYPES.NOTICES,
  [ROUTES.MEMBER_NEWS]: BANNER_TYPES.NEWS,
};

// 扩展路由映射，支持首页的多种路径形式
const EXTENDED_ROUTE_TO_BANNER_TYPE = {
  ...ROUTE_TO_BANNER_TYPE,
  '/member': ROUTE_TO_BANNER_TYPE[ROUTES.MEMBER_HOME],
  '/member/': ROUTE_TO_BANNER_TYPE[ROUTES.MEMBER_HOME],
  '/member/home': ROUTE_TO_BANNER_TYPE[ROUTES.MEMBER_HOME],
};

// 生成占位符图片（SVG data URI）
// 当没有从 API 获取到横幅时使用
const generatePlaceholderImage = (width = 1920, height = 400, text = '') => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">
        ${text || 'Banner Placeholder'}
      </text>
    </svg>
  `.trim();
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

// 默认横幅占位符（当 API 没有返回横幅时使用）
const getDefaultPlaceholder = (bannerType) => {
  return generatePlaceholderImage(1920, 400, 'Banner');
};

// 横幅文字切换组件
function BannerText({ text, isTitle }) {
  const Tag = isTitle ? 'h1' : 'p';
  
  return (
    <Tag 
      className={`${isTitle ? 'banner-title' : 'banner-subtitle'} banner-text-transition`}
    >
      {text}
    </Tag>
  );
}

/**
 * Generic Banner Component
 * 横幅组件 - 优先从数据库获取数据，如果没有数据或API失败则使用占位符
 * @param {Object} props
 * @param {string} props.bannerType - 横幅类型（如果提供，将直接使用，不进行路由匹配）
 * @param {Object} props.routeToBannerTypeMap - 路由到横幅类型的映射对象，如 { '/member/home': 'main_primary' }
 * @param {Object} props.defaultBannerImages - 默认横幅图片映射（可选，当数据库没有数据时使用，格式：{ 'main_primary': 'https://...' }）
 * @param {string} props.className - 额外的 CSS 类名
 * @param {string} props.sectionClassName - 外层 section 的 CSS 类名（默认: 'banner-section'）
 * @param {number} props.autoSwitchInterval - 自动切换间隔（毫秒，默认: 5000）
 * @param {number} props.height - 横幅高度（默认: '400px'）
 */
export default function Banner({
  bannerType: propBannerType = null,
  routeToBannerTypeMap = null,
  defaultBannerImages = null,
  className = '',
  sectionClassName = 'banner-section',
  autoSwitchInterval = 5000,
  height = '400px'
}) {
  // 使用传入的配置或默认配置
  const finalRouteToBannerTypeMap = routeToBannerTypeMap ?? EXTENDED_ROUTE_TO_BANNER_TYPE;
  const finalDefaultBannerImages = defaultBannerImages ?? {};
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [mainBanners, setMainBanners] = useState([]);
  const [displayBanners, setDisplayBanners] = useState([]); // 用于显示的 banner 数据，避免切换时闪烁
  const [currentBanner, setCurrentBanner] = useState(0);
  const [textKey, setTextKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const loadedImagesRef = useRef(new Set()); // 已加载的图片缓存（使用 ref 避免依赖问题）

  // 根据当前路由获取横幅类型
  const getBannerType = useCallback(() => {
    // 如果通过 props 传入，优先使用
    if (propBannerType) {
      return propBannerType;
    }
    
    const path = location.pathname;
    
    // 使用传入的路由映射进行匹配
    for (const [route, bannerType] of Object.entries(finalRouteToBannerTypeMap)) {
      // 精确匹配或前缀匹配
      if (path === route || path === `${route}/` || path.startsWith(route)) {
        return bannerType;
      }
    }
    
    return null; // 如果没有匹配的路由，不显示横幅
  }, [location.pathname, propBannerType, finalRouteToBannerTypeMap]);

  const bannerType = getBannerType();

  // 预加载图片
  const preloadImage = useCallback((imageUrl) => {
    return new Promise((resolve, reject) => {
      // 如果图片已经加载过，直接返回
      if (loadedImagesRef.current.has(imageUrl)) {
        resolve();
        return;
      }

      const img = new Image();
      img.onload = () => {
        loadedImagesRef.current.add(imageUrl);
        resolve();
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }, []); // 不依赖任何状态，使用 ref

  const loadBanners = useCallback(async () => {
    if (!bannerType) {
      // 只有在没有 banner 类型时才清空显示
      setMainBanners([]);
      setDisplayBanners([]);
      return;
    }

    // 检查缓存
    const cacheKey = `${bannerType}-${i18n.language}`;
    const cached = bannerCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      // 使用缓存数据
      setMainBanners(cached.banners);
      setDisplayBanners(cached.banners);
      setCurrentBanner(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    try {
      // 使用 contentService 获取横幅，传入 bannerType 参数
      const banners = await contentService.getBanners({ bannerType });
      let newBanners = [];
      
      if (Array.isArray(banners) && banners.length > 0) {
        newBanners = banners.map(b => ({
          id: b.id,
          imageUrl: b.imageUrl,
          link: b.linkUrl || null,
          title: b.title || null,
          subtitle: b.subtitle || b.description || null
        }));
      } else {
        // 如果数据库没有横幅数据，使用占位符
        newBanners = [{
          id: 'default',
          imageUrl: finalDefaultBannerImages?.[bannerType] || getDefaultPlaceholder(bannerType),
          link: null,
          title: null,
          subtitle: null
        }];
      }

      // 预加载所有图片
      try {
        await Promise.all(newBanners.map(banner => preloadImage(banner.imageUrl)));
      } catch (error) {
        loggerService.warn('Some banner images failed to preload', {
          module: 'Banner',
          function: 'loadBanners',
          error_message: error.message
        });
        // 即使预加载失败，也继续显示
      }

      // 更新缓存
      bannerCache.set(cacheKey, {
        banners: newBanners,
        timestamp: Date.now()
      });

      // 图片加载完成后再更新显示
      setMainBanners(newBanners);
      setDisplayBanners(newBanners);
      setCurrentBanner(0); // 重置到第一个 banner
    } catch (error) {
      loggerService.error('Failed to load banners', {
        module: 'Banner',
        function: 'loadBanners',
        banner_type: bannerType,
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: error.code || 'LOAD_BANNERS_FAILED',
        context_data: { banner_type: bannerType }
      });
      
      // API 调用失败时，使用占位符作为后备
      const fallbackBanner = [{
        id: 'default',
        imageUrl: finalDefaultBannerImages?.[bannerType] || getDefaultPlaceholder(bannerType),
        link: null,
        title: null,
        subtitle: null
      }];
      
      try {
        await preloadImage(fallbackBanner[0].imageUrl);
      } catch (preloadError) {
        loggerService.warn('Fallback banner image failed to preload', {
          module: 'Banner',
          function: 'loadBanners',
          error_message: preloadError.message
        });
      }
      
      setMainBanners(fallbackBanner);
      setDisplayBanners(fallbackBanner);
      setCurrentBanner(0);
    } finally {
      setIsLoading(false);
    }
  }, [bannerType, finalDefaultBannerImages, preloadImage, i18n.language]);

  // 监听语言和路由变化，重新加载数据
  useEffect(() => {
    // 只有当 bannerType 改变时才重新加载
    // 保留当前的 displayBanners 直到新数据加载完成
    if (bannerType) {
      loadBanners().catch(error => {
        loggerService.error('Failed to load banners', {
          module: 'Banner',
          function: 'useEffect',
          banner_type: bannerType,
          error_message: error.message,
          error_code: error.code
        });
        exceptionService.recordException(error, {
          request_path: window.location.pathname,
          error_code: error.code || 'LOAD_BANNERS_FAILED',
          context_data: { banner_type: bannerType }
        });
        setIsLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language, bannerType]); // 移除 loadBanners 依赖，避免无限循环

  // 横幅自动切换
  useEffect(() => {
    if (displayBanners.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % displayBanners.length);
    }, autoSwitchInterval);

    return () => clearInterval(timer);
  }, [displayBanners.length, autoSwitchInterval]);

  // 当横幅切换时，触发文字切换动画
  useEffect(() => {
    if (displayBanners.length > 0) {
      setTextKey((prev) => prev + 1);
    }
  }, [currentBanner, displayBanners.length]);

  // 横幅点击跳转处理
  const handleBannerClick = (link) => {
    if (link) {
      if (link.startsWith('http://') || link.startsWith('https://')) {
        window.open(link, '_blank');
      } else if (link.startsWith('/')) {
        navigate(link);
      } else {
        navigate(`/${link}`);
      }
    }
  };

  // 使用 useMemo 缓存计算值，避免每次渲染都重新计算
  const bannersToDisplay = useMemo(() => {
    return displayBanners.length > 0 ? displayBanners : mainBanners;
  }, [displayBanners, mainBanners]);

  const currentBannerData = useMemo(() => {
    return bannersToDisplay[currentBanner] || bannersToDisplay[0];
  }, [bannersToDisplay, currentBanner]);

  // 如果没有横幅类型，不渲染
  if (!bannerType) {
    return null;
  }
  
  if (bannersToDisplay.length === 0) {
    return null;
  }

  return (
    <section className={`${sectionClassName} banner-type-${bannerType} ${className}`}>
      <div className="banner-carousel">
        <div 
          className={`banner-image ${currentBannerData.link ? 'banner-clickable' : ''} ${isLoading ? 'banner-loading' : ''}`}
          style={{ 
            backgroundImage: `url(${currentBannerData.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: height,
            borderRadius: '0',
            cursor: currentBannerData.link ? 'pointer' : 'default',
            opacity: isLoading ? 0.9 : 1,
            transition: 'opacity 0.3s ease-in-out, background-image 0.3s ease-in-out'
          }}
          onClick={() => handleBannerClick(currentBannerData.link)}
          role="img"
          aria-label={currentBannerData.title || 'Banner image'}
        >
          <div className="banner-overlay">
            {currentBannerData?.title && (
              <BannerText
                key={`title-${currentBanner}-${textKey}`}
                text={currentBannerData.title}
                isTitle={true}
              />
            )}
            {currentBannerData?.subtitle && (
              <BannerText
                key={`subtitle-${currentBanner}-${textKey}`}
                text={currentBannerData.subtitle}
                isTitle={false}
              />
            )}
          </div>
        </div>
        
        {/* 横幅指示器 */}
        {bannersToDisplay.length > 1 && (
          <div className="banner-indicators">
            {bannersToDisplay.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentBanner ? 'active' : ''}`}
                onClick={() => setCurrentBanner(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

