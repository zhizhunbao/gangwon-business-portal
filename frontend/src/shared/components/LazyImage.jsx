/**
 * LazyImage Component
 * 懒加载图片组件 - 支持占位符、错误处理、渐进式加载
 * 
 * @param {string} src - 图片 URL
 * @param {string} alt - 图片替代文本
 * @param {string} placeholder - 占位符图片 URL（可选）
 * @param {string} className - CSS 类名
 * @param {object} style - 内联样式
 * @param {function} onLoad - 图片加载完成回调
 * @param {function} onError - 图片加载失败回调
 */

import { useState, useEffect, useRef } from 'react';
import { cn } from '@shared/utils/helpers';

export default function LazyImage({
  src,
  alt = '',
  placeholder = null,
  className = '',
  style = {},
  onLoad = null,
  onError = null,
  ...props
}) {
  const [imageSrc, setImageSrc] = useState(placeholder || src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    // 如果浏览器支持 Intersection Observer，使用懒加载
    if ('IntersectionObserver' in window && imgRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // 当图片进入视口时，开始加载
              const img = new Image();
              img.onload = () => {
                setImageSrc(src);
                setIsLoaded(true);
                if (onLoad) onLoad();
              };
              img.onerror = () => {
                setHasError(true);
                if (onError) onError();
              };
              img.src = src;
              
              // 停止观察
              observerRef.current.disconnect();
            }
          });
        },
        {
          rootMargin: '50px' // 提前 50px 开始加载
        }
      );

      observerRef.current.observe(imgRef.current);
    } else {
      // 不支持 Intersection Observer，直接加载
      setImageSrc(src);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, onLoad, onError]);

  const handleError = (e) => {
    if (!hasError && placeholder && e.target.src !== placeholder) {
      // 如果主图片加载失败，尝试使用占位符
      setImageSrc(placeholder);
      setHasError(true);
    } else if (onError) {
      onError(e);
    }
  };

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={cn(
        'block max-w-full h-auto',
        isLoaded ? 'opacity-100' : 'opacity-70',
        'transition-opacity duration-300 ease-in-out',
        className
      )}
      style={style}
      onError={handleError}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
}

