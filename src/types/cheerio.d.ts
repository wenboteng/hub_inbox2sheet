declare module 'cheerio' {
  export interface CheerioAPI {
    load(html: string | Buffer, options?: any): CheerioAPI;
    html(options?: any): string;
    text(): string;
    find(selector: string): Cheerio;
    children(selector?: string): Cheerio;
    parent(selector?: string): Cheerio;
    parents(selector?: string): Cheerio;
    closest(selector: string): Cheerio;
    next(selector?: string): Cheerio;
    prev(selector?: string): Cheerio;
    siblings(selector?: string): Cheerio;
    each(fn: (index: number, element: any) => void): Cheerio;
    map(fn: (index: number, element: any) => any): Cheerio;
    filter(selector: string | ((index: number, element: any) => boolean)): Cheerio;
    not(selector: string | ((index: number, element: any) => boolean)): Cheerio;
    has(selector: string | any): Cheerio;
    first(): Cheerio;
    last(): Cheerio;
    eq(index: number): Cheerio;
    get(index?: number): any;
    index(selector?: string | any): number;
    end(): Cheerio;
    add(selector: string | any, context?: any): Cheerio;
    addBack(selector?: string): Cheerio;
    attr(name: string, value?: any): any;
    prop(name: string, value?: any): any;
    data(name: string, value?: any): any;
    val(value?: any): any;
    removeAttr(name: string): Cheerio;
    hasClass(className: string): boolean;
    addClass(className: string): Cheerio;
    removeClass(className?: string): Cheerio;
    toggleClass(className: string, toggle?: boolean): Cheerio;
    is(selector: string | any): boolean;
    serialize(): string;
    serializeArray(): any[];
  }

  export interface Cheerio {
    length: number;
    [index: number]: any;
    selector: string;
    prevObject: Cheerio;
  }

  export function load(html: string | Buffer, options?: any): CheerioAPI;
  export default load;
} 