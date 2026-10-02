import React from 'react';
import { getDefaultDocContent } from '../../utils/documentDefaults';

/**
 * One A4 page of a BexSign document (794 x 1123 px, the size of an A4 sheet at 96 dpi).
 *
 * The document editor, the signing page and the document view all draw their pages with this component. A placed
 * field is stored as a position on the page (x, y from the page's top-left corner), so the text must land on the
 * same spot everywhere: sharing the markup is what keeps a field next to the words the sender put it beside.
 *
 * Page 1 holds the title, the BexSign Document ID and the document text. It grows with the text. Later pages are
 * signature pages. Fields and other overlays are passed as children and positioned absolutely on the page.
 */

export const PAGE_WIDTH = 794;
export const PAGE_MIN_HEIGHT = 1123;

const PLACEHOLDER_TEXT = 'check the document for signature';

/** The text shown on page 1: the document's own text, or the standard text for its name when it has none. */
export function resolveDocumentText(documentText, documentName, customMessage) {
  const text = String(documentText || '');
  if (text.trim() && text.trim() !== PLACEHOLDER_TEXT) return text;
  return getDefaultDocContent(documentName, customMessage || text);
}

export const isRichText = (text) => /<[a-z][\s\S]*>/i.test(String(text || ''));

export default function DocumentPage({
  pageNum = 1,
  totalPages = 1,
  title = '',
  docIdText = '',
  documentText = '',
  customMessage = '',
  // Buttons shown at the top right of the page (they float over the header and never move the text)
  headerAction = null,
  // Content placed after the text of page 1, in the normal flow (a default signature block)
  afterText = null,
  textRef = null,
  pageRef = null,
  id,
  className = '',
  style,
  children,
  ...rest
}) {
  const body = resolveDocumentText(documentText, title, customMessage);

  return (
    <div
      id={id}
      ref={pageRef}
      data-doc-page={pageNum}
      style={style}
      className={`relative w-[794px] min-h-[1123px] max-w-[794px] shrink-0 bg-white text-slate-900 p-14 border border-slate-300 flex flex-col justify-between select-text font-sans ${className}`}
      {...rest}
    >
      {/* Page Top Content */}
      <div className="flex-1 flex flex-col">
        {pageNum === 1 ? (
          /* Page 1: Header + Document Clauses */
          <div ref={textRef} data-doc-text="true" className="space-y-4 pb-6 border-b border-slate-200">
            <div className="relative border-b border-slate-200 pb-3">
              <div className="min-w-0 pr-32">
                <h1 className="text-xl font-black text-slate-900 tracking-tight break-words">{title}</h1>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5 break-all">BexSign Document ID: {docIdText}</p>
              </div>
              {headerAction && (
                <div data-layout-skip="true" className="absolute right-0 top-0 print:hidden">{headerAction}</div>
              )}
            </div>

            {/* Full Document Clauses & Text */}
            <div data-doc-body="true" className="text-xs text-slate-700 leading-relaxed font-sans select-text">
              {isRichText(body) ? (
                <div dangerouslySetInnerHTML={{ __html: body }} className="space-y-2 bex-rich-text" />
              ) : (
                <div className="whitespace-pre-line">{body}</div>
              )}
            </div>
          </div>
        ) : (
          /* Page 2+: Execution & Signatures Block Header */
          <div data-doc-text="true" className="border-b border-slate-200 pb-4 mb-6">
            <div className="relative">
              <div className="min-w-0 pr-32">
                <h2 className="text-lg font-black text-slate-900 tracking-tight break-words">{title}</h2>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Execution & Signatures • Page {pageNum} of {totalPages}
                </p>
              </div>
              {headerAction && (
                <div data-layout-skip="true" className="absolute right-0 top-0 print:hidden">{headerAction}</div>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              IN WITNESS WHEREOF, the parties hereto have executed this Agreement by affixing their digital signatures and requested verification fields below.
            </p>
          </div>
        )}
        {pageNum === 1 && afterText}
      </div>

      {/* Page Footer */}
      <div data-doc-footer="true" className="border-t border-slate-200 pt-3 mt-6 flex justify-between items-center text-[10px] text-slate-400 font-mono select-none">
        <span>Page {pageNum} of {totalPages} • BexSign Legal Verification</span>
        <span>A4 (210 × 297 mm) • SHA-256</span>
      </div>

      {children}
    </div>
  );
}
