/**
 * Banner Component - Generic
 * 通用横幅组件 - 支持轮播、自动切换、点击跳转、响应式图片等功能
 * 使用纯 Tailwind CSS
 */

import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  homeService,
} from "@shared/services";
import { BANNER_TYPES, ROUTES } from "@shared/utils/constants";

// Banner 数据缓存 - 在模块级别缓存，避免重复请求
const bannerCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// 移动端断点宽度
const MOBILE_BREAKPOINT = 1024;

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

// 扩展路由映射
const EXTENDED_ROUTE_TO_BANNER_TYPE = {
  ...ROUTE_TO_BANNER_TYPE,
  "/member": ROUTE_TO_BANNER_TYPE[ROUTES.MEMBER_HOME],
  "/member/": ROUTE_TO_BANNER_TYPE[ROUTES.MEMBER_HOME],
  "/member/home": ROUTE_TO_BANNER_TYPE[ROUTES.MEMBER_HOME],
};

// Banner 类型对应的背景色（图片加载失败时显示）
const BANNER_BG_COLORS = {
  main_primary: 'bg-blue-800',
  main_secondary: 'bg-blue-700',
  about: 'bg-emerald-600',
  projects: 'bg-red-600',
  performance: 'bg-violet-600',
  support: 'bg-orange-600',
  profile: 'bg-cyan-600',
  notices: 'bg-pink-700',
  news: 'bg-amber-700',
};

// 生成占位符图片
const generatePlaceholderImage = (width = 1920, height = 400, text = "") => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">
        ${text || "Banner Placeholder"}
      </text>
    </svg>
  `.trim();
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

const getDefaultPlaceholder = () => generatePlaceholderImage(1920, 400, "Banner");

// 横幅文字组件
function BannerText({ text, isTitle }) {
  const baseClasses = "animate-[fadeInUp_0.6s_ease-out_forwards]";
  
  if (isTitle) {
    return (
      <h1 className={`text-4xl max-lg:text-3xl max-md:text-2xl font-bold m-0 mb-2 text-white ${baseClasses}`}
        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
        {text}
      </h1>
    );
  }
  
  return (
    <p className={`text-lg max-lg:text-base max-md:text-sm m-0 text-white/90 ${baseClasses}`}
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)', animationDelay: '0.2s' }}>
      {text}
    </p>
  );
}

/**
 * Custom hook for detecting mobile screen width
 */
function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= breakpoint;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Initial check
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}

/**
 * Generic Banner Component
 */
export default function Banner({
  bannerType: propBannerType = null,
  routeToBannerTypeMap = null,
  defaultBannerImages = null,
  className = "",
  sectionClassName = "",
  autoSwitchInterval = 5000,
  height = "400px",
  fullWidth = true, // 是否全宽（用于主 banner）
}) {
  const finalRouteToBannerTypeMap = routeToBannerTypeMap ?? EXTENDED_ROUTE_TO_BANNER_TYPE;
  const finalDefaultBannerImages = defaultBannerImages ?? {};
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [mainBanners, setMainBanners] = useState([]);
  const [displayBanners, setDisplayBanners] = useState([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [textKey, setTextKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // 初始为 true，避免闪烁
  const loadedImagesRef = useRef(new Set());
  
  // Use custom hook for mobile detection
  const isMobile = useIsMobile();

  const getBannerType = useCallback(() => {
    if (propBannerType) return propBannerType;

    const path = location.pathname;
    for (const [route, bannerType] of Object.entries(finalRouteToBannerTypeMap)) {
      if (path === route || path === `${route}/` || path.startsWith(route)) {
        return bannerType;
      }
    }
    return null;
  }, [location.pathname, propBannerType, finalRouteToBannerTypeMap]);

  const bannerType = getBannerType();

  const preloadImage = useCallback((imageUrl) => {
    return new Promise((resolve, reject) => {
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
  }, []);

  const loadBanners = useCallback(async () => {
    if (!bannerType) {
      setMainBanners([]);
      setDisplayBanners([]);
      return;
    }

    const cacheKey = `${bannerType}-${i18n.language}`;
    const cached = bannerCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setMainBanners(cached.banners);
      setDisplayBanners(cached.banners);
      setCurrentBanner(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const banners = await homeService.getBanners({ bannerType });
      let newBanners = [];

      if (Array.isArray(banners) && banners.length > 0) {
        newBanners = banners.map((b) => ({
          id: b.id,
          imageUrl: b.imageUrl,
          mobileImageUrl: b.mobileImageUrl || null, // Support mobile image URL
          link: b.linkUrl || null,
          title: i18n.language === "zh" ? b.titleZh || b.titleKo : b.titleKo || b.titleZh,
          subtitle: i18n.language === "zh" ? b.subtitleZh || b.subtitleKo : b.subtitleKo || b.subtitleZh,
        }));
      } else {
        newBanners = [{
          id: "default",
          imageUrl: finalDefaultBannerImages?.[bannerType] || getDefaultPlaceholder(),
          mobileImageUrl: null,
          link: null,
          title: null,
          subtitle: null,
        }];
      }

      try {
        // Preload both desktop and mobile images
        const imagesToPreload = newBanners.flatMap((banner) => {
          const images = [banner.imageUrl];
          if (banner.mobileImageUrl) {
            images.push(banner.mobileImageUrl);
          }
          return images;
        });
        await Promise.all(imagesToPreload.map((url) => preloadImage(url)));
      } catch (error) {
        // AOP 系统会自动处理异常日志
      }

      bannerCache.set(cacheKey, { banners: newBanners, timestamp: Date.now() });
      setMainBanners(newBanners);
      setDisplayBanners(newBanners);
      setCurrentBanner(0);
    } catch (error) {
      // 使用 fallback banner
      console.error('[Banner] Failed to load banners:', error);

      const fallbackBanner = [{
        id: "default",
        imageUrl: finalDefaultBannerImages?.[bannerType] || getDefaultPlaceholder(),
        mobileImageUrl: null,
        link: null,
        title: null,
        subtitle: null,
      }];

      try {
        await preloadImage(fallbackBanner[0].imageUrl);
      } catch (preloadError) {
        // AOP 系统会自动处理异常日志
      }

      setMainBanners(fallbackBanner);
      setDisplayBanners(fallbackBanner);
      setCurrentBanner(0);
    } finally {
      setIsLoading(false);
    }
  }, [bannerType, finalDefaultBannerImages, preloadImage, i18n.language]);

  useEffect(() => {
    if (bannerType) {
      loadBanners().catch((error) => {
        // AOP 系统会自动处理异常日志
        setIsLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language, bannerType]);

  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % displayBanners.length);
    }, autoSwitchInterval);
    return () => clearInterval(timer);
  }, [displayBanners.length, autoSwitchInterval]);

  useEffect(() => {
    if (displayBanners.length > 0) {
      setTextKey((prev) => prev + 1);
    }
  }, [currentBanner, displayBanners.length]);

  const handleBannerClick = (link) => {
    if (link) {
      if (link.startsWith("http://") || link.startsWith("https://")) {
        window.open(link, "_blank");
      } else if (link.startsWith("/")) {
        navigate(link);
      } else {
        navigate(`/${link}`);
      }
    }
  };

  const bannersToDisplay = useMemo(() => {
    return displayBanners.length > 0 ? displayBanners : mainBanners;
  }, [displayBanners, mainBanners]);

  const currentBannerData = useMemo(() => {
    return bannersToDisplay[currentBanner] || bannersToDisplay[0];
  }, [bannersToDisplay, currentBanner]);

  // Get the appropriate image URL based on screen size
  const currentImageUrl = useMemo(() => {
    if (!currentBannerData) return getDefaultPlaceholder();
    
    // If mobile and mobile image exists, use mobile image
    if (isMobile && currentBannerData.mobileImageUrl) {
      return currentBannerData.mobileImageUrl;
    }
    
    // Otherwise use desktop image
    return currentBannerData.imageUrl;
  }, [currentBannerData, isMobile]);

  if (!bannerType) {
    return null;
  }

  // 加载中或没有数据时显示骨架屏占位
  if (isLoading || bannersToDisplay.length === 0) {
    const fullWidthClasses = fullWidth 
      ? "w-screen max-w-[100vw] -mt-[70px] max-md:-mt-[60px] ml-[calc(50%-50vw)] mr-[calc(50%-50vw)]" 
      : "w-full h-full";
    const heightClasses = fullWidth 
      ? "min-h-[400px] max-md:min-h-[300px] max-sm:min-h-[250px]" 
      : "h-full";

    return (
      <section className={`relative overflow-hidden ${fullWidthClasses} ${sectionClassName} ${className}`}>
        <div 
          className={`relative flex items-center justify-center w-full ${heightClasses} bg-gray-200 animate-pulse`}
          style={{ height: fullWidth ? height : '100%' }}
        />
      </section>
    );
  }

  const bgColorClass = BANNER_BG_COLORS[bannerType] || 'bg-blue-800';
  
  // 全宽样式（用于页面顶部主 banner）
  const fullWidthClasses = fullWidth 
    ? "w-screen max-w-[100vw] -mt-[70px] max-md:-mt-[60px] ml-[calc(50%-50vw)] mr-[calc(50%-50vw)]" 
    : "w-full h-full";

  // 非全宽时不设置 min-height，让它自适应父容器
  const heightClasses = fullWidth 
    ? "min-h-[400px] max-md:min-h-[300px] max-sm:min-h-[250px]" 
    : "h-full";

  return (
    <section className={`relative overflow-hidden ${fullWidthClasses} ${sectionClassName} ${className}`}>
      <div className="relative overflow-hidden w-full h-full">
        <div
          className={`relative flex items-center justify-center w-full ${heightClasses} bg-cover bg-center bg-no-repeat transition-opacity duration-300 ${bgColorClass} ${
            currentBannerData.link ? "cursor-pointer hover:opacity-90" : ""
          } ${isLoading ? "opacity-90" : "opacity-100"}`}
          style={{
            backgroundImage: `url(${currentImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: fullWidth ? height : '100%',
          }}
          onClick={() => handleBannerClick(currentBannerData.link)}
          role="img"
          aria-label={currentBannerData.title || "Banner image"}
        >
          {/* Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8 max-md:p-6 text-center"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5))' }}>
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

        {/* 指示器 */}
        {bannersToDisplay.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {bannersToDisplay.map((_, index) => (
              <button
                key={index}
                className={`p-0 border-none cursor-pointer transition-all duration-300 ${
                  index === currentBanner 
                    ? "w-6 h-2.5 bg-white rounded" 
                    : "w-2.5 h-2.5 bg-white/50 rounded-full hover:bg-white/70"
                }`}
                onClick={() => setCurrentBanner(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}

// Export the useIsMobile hook for use in other components
export { useIsMobile };
