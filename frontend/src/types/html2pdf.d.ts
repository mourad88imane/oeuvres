declare module "html2pdf.js" {
  interface Html2PdfOptions {
    margin?: number | [number, number, number, number];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: Partial<{
      scale: number;
      useCORS: boolean;
      logging: boolean;
      letterRendering: boolean;
      width: number;
      height: number;
      scrollY: number;
    }>;
    jsPDF?: Partial<{
      unit: string;
      format: string;
      orientation: "portrait" | "landscape";
    }>;
    pagebreak?: { mode?: string | string[]; before?: string[]; after?: string[]; avoid?: string[] };
  }

  interface Html2PdfInstance {
    set(opt: Html2PdfOptions): Html2PdfInstance;
    from(element: HTMLElement): Html2PdfInstance;
    toContainer(): Html2PdfInstance;
    toCanvas(): Html2PdfInstance;
    toImg(): Html2PdfInstance;
    toPdf(): Html2PdfInstance;
    save(): Promise<void>;
    output(type: string): Promise<any>;
    then<T>(fn: () => T): Promise<T>;
  }

  function html2pdf(): Html2PdfInstance;
  function html2pdf(element: HTMLElement, opts?: Html2PdfOptions): Html2PdfInstance;
  
  export default html2pdf;
}