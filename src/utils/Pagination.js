export default class Paginate {
  //   data: any;
  //   page: number;
  //   pageSize: number;
  //   totalRecord: number;
  //   isFirst: boolean;
  //   isLast: boolean;

  constructor(payload, page, pageSize) {
    this.page = page;
    this.page_size = pageSize;
    this.total_records = payload.count || payload.length || 0;
    this.is_first = page === 1;
    this.is_last = page * pageSize >= this.total_records;
  }
}
