import os
import sys
import argparse
from pathlib import Path
import win32com.client
import fitz  # PyMuPDF

def pptx_to_temp_pdf(pptx_path: Path, temp_pdf_path: Path):
    """使用 PowerPoint 导出为标准 PDF"""
    print(f"正在启动 PowerPoint 转换: {pptx_path.name}...")
    try:
        powerpoint = win32com.client.Dispatch("PowerPoint.Application")
    except Exception as e:
        print(f"✗ 无法启动 PowerPoint: {e}")
        print("请确保已安装 Microsoft PowerPoint 且环境为 Windows。")
        sys.exit(1)
        
    try:
        abs_pptx = str(pptx_path.absolute())
        abs_pdf = str(temp_pdf_path.absolute())
        
        presentation = powerpoint.Presentations.Open(abs_pptx, WithWindow=False)
        # 32 是 PowerPoint 另存为 PDF 的常量
        presentation.SaveAs(abs_pdf, 32)
        presentation.Close()
        print("✓ 标准 PDF 转换完成")
    except Exception as e:
        print(f"✗ PowerPoint 转换失败: {e}")
        raise
    finally:
        powerpoint.Quit()

def pdf_to_image_pdf(input_pdf: Path, output_pdf: Path, dpi: int = 300):
    """将 PDF 转换为每一页都是图片的截屏版 PDF"""
    print(f"正在将 PDF 转换为截图版 (DPI: {dpi})...")
    doc = fitz.open(input_pdf)
    img_pdf = fitz.open()  # 新建一个 PDF 容器
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        # 渲染页面为位图
        pix = page.get_pixmap(dpi=dpi)
        img_data = pix.tobytes("png")
        
        # 将图片插入到新的 PDF 页面中
        img_pdf_page = img_pdf.new_page(width=page.rect.width, height=page.rect.height)
        img_pdf_page.insert_image(page.rect, stream=img_data)
        print(f"  ✓ 处理第 {page_num + 1} 页")

    img_pdf.save(output_pdf)
    img_pdf.close()
    doc.close()
    print(f"✓ 截图版 PDF 已保存至: {output_pdf}")

def main():
    parser = argparse.ArgumentParser(description="将 PPTX 转换为截图版 PDF")
    parser.add_argument("input", help="输入的 PPTX 文件路径")
    parser.add_argument("-o", "--output", help="输出的 PDF 文件路径")
    parser.add_argument("--dpi", type=int, default=300, help="渲染 DPI (默认 300)")
    
    args = parser.parse_args()
    
    input_pptx = Path(args.input)
    if not input_pptx.exists():
        print(f"❌ 错误: 找不到文件 {input_pptx}")
        sys.exit(1)
        
    if args.output:
        output_pdf = Path(args.output)
    else:
        output_pdf = input_pptx.with_suffix(".pdf")
        
    temp_pdf = input_pptx.with_suffix(".temp_standard.pdf")
    
    try:
        # 1. PPTX -> PDF
        pptx_to_temp_pdf(input_pptx, temp_pdf)
        
        # 2. PDF -> Image PDF (截图化)
        pdf_to_image_pdf(temp_pdf, output_pdf, dpi=args.dpi)
        
        # 清理临时文件
        if temp_pdf.exists():
            os.remove(temp_pdf)
            
        print("\n" + "="*40)
        print("✨ 转换任务全部完成！")
        print(f"成果文件: {output_pdf}")
        print("="*40)
        
    except Exception as e:
        print(f"❌ 运行出错: {e}")
        if temp_pdf.exists():
            os.remove(temp_pdf)
        sys.exit(1)

if __name__ == "__main__":
    main()
