export default class Paginator {
  constructor(config = {}) {
    this.count = config.count;
    this.currentPage = config.current_page;
    this.perPage = config.per_page;
    this.total = config.total;
    this.totalPage = config.total_pages;
  }
}