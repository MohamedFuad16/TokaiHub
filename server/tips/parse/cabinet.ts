/**
 * キャビネット (SDW0001000). One page holds the whole tree: each folder row tr#folderN is
 * followed by tbody#detailN with its files (table#fileTableN, tr.fileRecord) and a nested
 * table.recursiveSimpleTable of subfolders. Files link either outside (Box, YouTube) or to
 * SDW-filerefer-flow?fileId=&folderId=, which the bridge proxies.
 */
import { load, clean, type $ } from './util';

export interface CabinetFile { name: string; date: string; summary: string; url?: string; fileId?: string; folderId?: string }
export interface CabinetFolder { id: string; name: string; period: string; owner: string; summary: string; files: CabinetFile[]; children: CabinetFolder[] }

function files($: $, detail: any, id: string): CabinetFile[] {
  return $(detail).find(`#fileTable${id} tr.fileRecord`).toArray().map((tr): CabinetFile => {
    const td = $(tr).children('td');
    const a = td.eq(1).find('a').first();
    const href = a.attr('href') ?? '';
    const ref = /fileId=(\d+)&folderId=(\d+)/.exec(href);
    return {
      name: clean(a.text() || td.eq(1).text()),
      date: clean(td.eq(2).text()),
      summary: clean(td.eq(3).text()),
      ...(ref ? { fileId: ref[1], folderId: ref[2] } : /^https?:/.test(href) ? { url: href } : {}),
    };
  }).filter(f => f.name && (f.url || f.fileId));
}

function folders($: $, table: any): CabinetFolder[] {
  // The HTML5 parser wraps rows in an implicit <tbody>, so look one level down as well.
  const rows = $(table).children('tr[id^="folder"]').add($(table).children('tbody').children('tr[id^="folder"]'));
  return rows.toArray().map(tr => {
    const id = ($(tr).attr('id') ?? '').replace('folder', '');
    const td = $(tr).children('td');
    const detail = $(`tbody#detail${id}`).first();
    // The first nested folder table inside the detail block is this folder's direct children.
    const sub = detail.find('table.recursiveSimpleTable').first();
    return {
      id, name: clean(td.eq(0).text()), period: clean(td.eq(1).text()), owner: clean(td.eq(2).text()), summary: clean(td.eq(3).text()),
      files: files($, detail, id),
      children: sub.length ? folders($, sub) : [],
    };
  });
}

export function parse(html: string) {
  const $ = load(html);
  const top = $('table.simpleTable').not('.recursiveSimpleTable').first();
  return { folders: folders($, top) };
}
