/**
 * Rich Text Editor Component
 * 富文本编辑器组件
 */

import { useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { cn } from '@shared/utils/helpers';

export const RichTextEditor = ({
  label,
  error,
  help,
  required,
  value,
  onChange,
  className,
  placeholder,
  ...props
}) => {
  const quillRef = useRef(null);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': [] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'color', 'background',
    'align',
    'link', 'image'
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
      <div className={cn(
        'bg-white rounded',
        '[&_.quill]:bg-white',
        '[&_.ql-container]:rounded-b',
        '[&_.ql-container]:text-sm',
        '[&_.ql-container]:min-h-[200px]',
        '[&_.ql-editor]:min-h-[200px]',
        '[&_.ql-toolbar]:rounded-t',
        '[&_.ql-toolbar]:border-b',
        '[&_.ql-toolbar]:border-gray-200',
        '[&_.ql-editor.ql-blank::before]:text-gray-400',
        '[&_.ql-editor.ql-blank::before]:not-italic',
        error && '[&_.ql-container]:border-red-500 [&_.ql-toolbar]:border-red-500 [&_.ql-container:focus-within]:border-red-500 [&_.ql-toolbar:focus-within]:border-red-500 [&_.ql-container:focus-within]:ring-2 [&_.ql-toolbar:focus-within]:ring-2 [&_.ql-container:focus-within]:ring-red-500/10 [&_.ql-toolbar:focus-within]:ring-red-500/10',
        className
      )}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value || ''}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          {...props}
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

