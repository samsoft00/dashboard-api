import { readFileSync } from 'fs-extra';
import Puppeteer from 'puppeteer';
import path from 'path';
import { Liquid } from 'liquidjs';

import UploadService from './upload.service';

/**
 * Invoice module
 */
export default class FileService {
  constructor(data) {
    this.data = data;
    this.uploader = new UploadService();
  }

  async getHtml(segment) {
    try {
      const templatePath = path.resolve(__dirname, `../templates/${segment}`);
      const content = readFileSync(templatePath, 'utf8');

      const engine = new Liquid();
      return engine.parseAndRender(content, this.data);
    } catch (error) {
      throw new Error('Cannot generate HTML template.');
    }
  }

  async generateInvoice() {
    const html = await this.getHtml('invoice-file.hbs');

    const browser = await Puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);

    const filename = `${this.data.invoice_no}-invoice.pdf`;
    // const savePath = path.resolve('invoices', '.', filename);

    const pdfOptions = {
      // path: savePath,
      printBackground: true,
      format: 'Letter',
      preferCSSPageSize: true,
      // pageRanges: '1-1',
    };

    const pdfFile = await page.pdf(pdfOptions);
    const file = {
      buffer: pdfFile.buffer,
      size: pdfFile.byteLength,
      originalname: filename,
    };

    const resp = await this.uploader.uploadFile(null, file, null);

    return { file_url: resp.message, filename };
  }

  async generateClientApproval() {
    const html = await this.getHtml('client.authorization.liquid');

    const browser = await Puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);

    const filename = `${this.data.reference_no}-approval.pdf`;

    const pdfOptions = {
      printBackground: true,
      format: 'Letter',
      preferCSSPageSize: true,
    };

    const pdfFile = await page.pdf(pdfOptions);
    const file = {
      buffer: pdfFile.buffer,
      size: pdfFile.byteLength,
      originalname: filename,
    };

    const resp = await this.uploader.uploadFile(null, file, null);

    return { file_url: resp.message, filename };
  }
}
