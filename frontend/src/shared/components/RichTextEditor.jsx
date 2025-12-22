/**
 * Rich Text Editor Component
 * 富文本编辑器组件
 * 
 * Uses React Quill for rich text editing
 * 使用 React Quill 富文本编辑器
 */

import React, { useMemo, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { cn } from '@shared/utils/helpers';
import uploadService from '@shared/services/upload.service';
import './RichTextEditor.css';

export const RichTextEditor = ({
  label,
  error,
  help,
  required,
  value,
  onChange,
  className,
  placeholder,
  height,
  ...props
}) => {
  const quillRef = useRef(null);
  const editorHeight = height || 300;

  // 自定义图片上传处理器
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      // 验证文件大小（最大 10MB）
      if (file.size > 10 * 1024 * 1024) {
        alert('图片大小不能超过10MB');
        return;
      }

      try {
        // 上传图片
        const response = await uploadService.uploadPublic(file);
        
        if (response && response.file_url) {
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', response.file_url);
            quill.setSelection(range.index + 1);
          }
        } else {
          alert('图片上传失败，请重试');
        }
      } catch (err) {
        // AOP 系统会自动记录错误
        alert(err.message || '图片上传失败，请重试');
      }
    };
  };

  // Quill 模块配置
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['blockquote', 'code-block'],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: imageHandler,
      },
    },
    clipboard: {
      matchVisual: false,
    },
  }), []);

  // Quill 格式化配置
  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'blockquote', 'code-block',
    'link', 'image', 'video',
  ];

  return (
    <div className="mb-4">
      {label && (
        <label className={cn(
          'block text-sm font-medium text-gray-700 mb-1.5',
          required && 'after:content-["*"] after:text-red-500 after:ml-1'
        )}>
          {label}
        </label>
      )}
      <div 
        className={cn(
          'bg-white rounded border border-gray-300 overflow-hidden',
          error && 'border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/10',
          className
        )}
      >
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value || ''}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder || '输入内容...'}
          style={{ height: `${editorHeight}px` }}
          className="rich-text-editor-quill"
        />
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      )}
      {help && !error && (
        <p className="mt-1.5 text-sm text-gray-500">{help}</p>
      )}
    </div>
  );
};

export default RichTextEditor;
