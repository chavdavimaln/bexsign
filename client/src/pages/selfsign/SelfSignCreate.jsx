/**
 * Sign yourself - the step-by-step create flow (client/src/pages/selfsign/SelfSignCreate.jsx).
 *
 *   1 Add documents   upload files, choose templates, or write a document in BexSign
 *   2 Name & merge    name the whole thing, rename/replace/remove a document, merge several into one file
 *   3 Prepare fields  place signature, date, full name, stamp... - or stop here if the document is all you needed
 *   4 Sign            happens in the editor ("Sign & finish")
 *   5 Done            the document's own page, with its signed PDF and its history
 *
 * Steps 1 and 2 are the wizard; step 3 hands over to the field editor or finishes the flow.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  PenTool,
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  FileBox,
  FilePlus2,
  Combine,
  Pencil,
  Replace,
  Trash2,
  Download,
  CheckCircle2,
  Upload,
  X,
  Info
} from 'lucide-react';
import {
  PageHeader,
  Card,
  Button,
  Field,
  inputClass,
  ConfirmDialog,
  ErrorBanner,
  LoadingBlock,
  useToast
} from '../../components/ui/kit';
import TemplatePickerModal from '../../components/templates/TemplatePickerModal';
import { templatesToDocuments, countTemplateUse } from '../../components/templates/templateUi';
import { Stepper, DocumentDropzone, DocumentTile, MergeModal, RenameModal } from '../../components/selfsign/selfSignUi';
import RichTextField from '../../components/editor/RichTextField';
import {
  createSelfSign,
  getSelfSign,
  addSelfSignDocuments,
  replaceSelfSignDocument,
  removeSelfSignDocument,
  mergeSelfSignDocuments,
  renameSelfSign,
  downloadSelfSign,
  buildDocumentsForm
} from '../../components/selfsign/selfSignApi';

const STEPS = [
  { id: 'add', label: 'Add documents', hint: 'Upload, template or new' },
  { id: 'name', label: 'Name & merge', hint: 'Organise the file' },
  { id: 'fields', label: 'Prepare fields', hint: 'Optional' },
  { id: 'sign', label: 'Sign', hint: 'Your signature' },
  { id: 'done', label: 'Done', hint: 'Download & share' }
];

const stripExtension = (name) => String(name || '').replace(/\.[^./\\]+$/, '');

export default function SelfSignCreate() {
  const navigate = useNavigate();
  const { id: idParam } = useParams();
  const [params] = useSearchParams();
  const [toast, showToast] = useToast();

  // Documents staged before the self-sign document exists on the server (step 1)
  const [staged, setStaged] = useState([]);
  const [title, setTitle] = useState('');
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // The self-sign document once it exists (step 2 onwards)
  const [record, setRecord] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(Boolean(idParam));

  const [showTemplates, setShowTemplates] = useState(false);
  const [templateMode, setTemplateMode] = useState('add'); // 'add' | 'replace'
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showMerge, setShowMerge] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [blankDraft, setBlankDraft] = useState(null);
  const replaceInputRef = useRef(null);
  const addInputRef = useRef(null);

  const loadRecord = useCallback(async (selfSignId) => {
    setLoading(true);
    try {
      const data = await getSelfSign(selfSignId);
      setRecord(data.selfSign);
      setDocuments(data.documents || []);
      setTitle(data.selfSign.title);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (idParam) {
      loadRecord(idParam);
      setStep(Number(params.get('step')) || 2);
    }
  }, [idParam, loadRecord]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------------------------------------------------------- step 1: staging */

  const addFiles = (files) => {
    setStaged((prev) => [
      ...prev,
      ...files.map((file) => ({
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: /\.[a-z0-9]+$/i.test(file.name) ? file.name : `${file.name}.pdf`,
        file,
        documentText: '',
        source: 'upload'
      }))
    ]);
    if (!title) setTitle(stripExtension(files[0].name));
  };

  const addTemplates = (templates) => {
    const docs = templatesToDocuments(templates);
    templates.forEach(countTemplateUse);
    setShowTemplates(false);
    if (replaceTarget) {
      applyTemplateReplace(docs[0]);
      return;
    }
    setStaged((prev) => [
      ...prev,
      ...docs.map((d, i) => ({
        key: `tpl-${Date.now()}-${i}`,
        name: d.name,
        file: null,
        documentText: d.documentText,
        source: 'template',
        templateName: templates[i]?.name || ''
      }))
    ]);
    if (!title) setTitle(stripExtension(docs[0]?.name));
  };

  const addBlank = () => {
    setBlankDraft({ name: `Document ${staged.length + documents.length + 1}.pdf`, documentText: '' });
  };

  const confirmBlank = () => {
    const draft = blankDraft;
    setBlankDraft(null);
    const entry = {
      key: `new-${Date.now()}`,
      name: /\.pdf$/i.test(draft.name) ? draft.name : `${draft.name}.pdf`,
      file: null,
      documentText: draft.documentText,
      source: 'created'
    };
    if (record) {
      runAddToRecord([entry]);
      return;
    }
    setStaged((prev) => [...prev, entry]);
    if (!title) setTitle(stripExtension(entry.name));
  };

  const createRecord = async () => {
    if (staged.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const sources = new Set(staged.map((d) => d.source));
      const form = buildDocumentsForm(staged, {
        title: title.trim() || stripExtension(staged[0].name) || 'Self-signed document',
        source: sources.size === 1 ? [...sources][0] : 'upload',
        templateName: staged.find((d) => d.templateName)?.templateName || ''
      });
      const data = await createSelfSign(form);
      setRecord(data.selfSign);
      setDocuments(data.documents || []);
      setStaged([]);
      setStep(2);
      showToast('success', 'Your self-sign document was created.');
      navigate(`/sign-yourself/new/${data.selfSign.id}?step=2`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  /* ---------------------------------------------------------------- step 2: the real record */

  const applyResult = (data) => {
    if (data.selfSign) setRecord(data.selfSign);
    if (data.documents) setDocuments(data.documents);
    setSelectedIds([]);
  };

  const runAddToRecord = async (entries) => {
    setBusy(true);
    try {
      applyResult(await addSelfSignDocuments(record.id, buildDocumentsForm(entries)));
      showToast('success', `${entries.length} document${entries.length === 1 ? '' : 's'} added.`);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const applyTemplateReplace = async (doc) => {
    const target = replaceTarget;
    setReplaceTarget(null);
    if (!target || !record) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.set('name', doc.name);
      form.set('documentText', doc.documentText || '');
      applyResult(await replaceSelfSignDocument(record.id, target.fileId, form));
      showToast('success', `"${target.name}" was replaced.`);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const replaceWithFile = async (file) => {
    const target = replaceTarget;
    setReplaceTarget(null);
    if (!target || !file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.set('name', file.name);
      form.append('file', file, file.name);
      applyResult(await replaceSelfSignDocument(record.id, target.fileId, form));
      showToast('success', `"${target.name}" was replaced with ${file.name}.`);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const runRenameDocument = async (name) => {
    const target = renaming;
    setRenaming(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.set('name', name);
      applyResult(await replaceSelfSignDocument(record.id, target.fileId, form));
      showToast('success', 'The document was renamed.');
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const runRemove = async () => {
    const target = removing;
    setRemoving(null);
    setBusy(true);
    try {
      applyResult(await removeSelfSignDocument(record.id, target.fileId));
      showToast('success', `"${target.name}" was removed.`);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const runMerge = async (fileName) => {
    setBusy(true);
    try {
      const data = await mergeSelfSignDocuments(record.id, { fileIds: selectedIds, fileName });
      applyResult(data);
      setShowMerge(false);
      showToast('success', `Merged into "${data.merged.fileName}" (${data.merged.pageCount} pages).`);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveTitle = async () => {
    const next = title.trim();
    if (!record || !next || next === record.title) return;
    try {
      const data = await renameSelfSign(record.id, next);
      setRecord(data.selfSign);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  /* ---------------------------------------------------------------- render */

  const stagedTiles = staged.map((doc, index) => ({
    ...doc,
    fileId: doc.key,
    index,
    hasFile: Boolean(doc.file),
    fileType: doc.file ? (doc.name.split('.').pop() || 'pdf') : '',
    fileSize: doc.file ? Math.round(doc.file.size / 1024) : null
  }));

  const currentDocuments = record ? documents : stagedTiles;
  const canMerge = record && selectedIds.length >= 2;

  return (
    <div className="space-y-5 max-w-[1200px]">
      <PageHeader
        eyebrow="Sign yourself"
        title={record ? record.title : 'New self-sign document'}
        description="Add your documents, name them, then sign them yourself. You can stop after step 2 if you only need the document."
        icon={PenTool}
        actions={(
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/sign-yourself/all')}>Back to Sign yourself</Button>
        )}
      >
        <Stepper steps={STEPS} current={step} onStep={(n) => record && setStep(Math.min(n, 3))} />
      </PageHeader>

      {error && <ErrorBanner message={error} onRetry={idParam ? () => loadRecord(idParam) : undefined} />}
      {loading && <LoadingBlock label="Loading this self-sign document..." />}

      {/* ---------------------------------------------------------- step 1 */}
      {!loading && step === 1 && (
        <Card
          title="Step 1 · Add documents"
          description="Everything you add here becomes part of this self-sign document. Nothing is sent to anybody."
        >
          <div className="space-y-4">
            <DocumentDropzone
              onFiles={addFiles}
              onTemplates={() => {
                setTemplateMode('add');
                setReplaceTarget(null);
                setShowTemplates(true);
              }}
              onBlank={addBlank}
            />

            {stagedTiles.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-700 mb-2">{stagedTiles.length} document{stagedTiles.length === 1 ? '' : 's'} ready to add</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {stagedTiles.map((doc, index) => (
                    <DocumentTile
                      key={doc.key}
                      doc={doc}
                      index={index}
                      actions={[
                        { label: 'Remove', icon: Trash2, danger: true, onClick: () => setStaged((prev) => prev.filter((d) => d.key !== doc.key)) }
                      ]}
                    />
                  ))}
                </div>
              </div>
            )}

            <Field label="Name this self-sign document" required hint="You can change it in the next step too.">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Consulting agreement 2026" />
            </Field>

            <div className="flex flex-wrap justify-end gap-2 pt-1 border-t border-slate-100">
              <Button variant="secondary" onClick={() => navigate('/sign-yourself/all')}>Cancel</Button>
              <Button icon={ArrowRight} busy={busy} disabled={stagedTiles.length === 0 || !title.trim()} onClick={createRecord}>
                Next: name &amp; merge
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ---------------------------------------------------------- step 2 */}
      {!loading && step === 2 && record && (
        <Card
          title="Step 2 · Name & merge"
          description="Rename, replace or remove a document, add more, or merge several into a single file."
          actions={(
            <>
              <Button variant="secondary" icon={FileBox} onClick={() => { setTemplateMode('add'); setReplaceTarget(null); setShowTemplates(true); }}>Add templates</Button>
              <Button variant="secondary" icon={FilePlus2} onClick={addBlank}>Write a new one</Button>
              <Button variant="secondary" icon={Combine} disabled={!canMerge} onClick={() => setShowMerge(true)}>
                Merge{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
              </Button>
            </>
          )}
        >
          <div className="space-y-4">
            <Field label="Document name" required>
              <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} className={inputClass} />
            </Field>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {documents.map((doc, index) => (
                <DocumentTile
                  key={doc.fileId}
                  doc={doc}
                  index={index}
                  selected={selectedIds.includes(String(doc.fileId))}
                  onToggle={() => setSelectedIds((prev) => (
                    prev.includes(String(doc.fileId)) ? prev.filter((x) => x !== String(doc.fileId)) : [...prev, String(doc.fileId)]
                  ))}
                  actions={[
                    { label: 'Edit fields on this document', icon: PenTool, onClick: () => navigate(`/sign-yourself/prepare/${record.documentId}`) },
                    { label: 'Rename', icon: Pencil, onClick: () => setRenaming(doc) },
                    { label: 'Replace with a file', icon: Replace, onClick: () => { setReplaceTarget(doc); replaceInputRef.current?.click(); } },
                    { label: 'Replace with a template', icon: FileBox, onClick: () => { setReplaceTarget(doc); setTemplateMode('replace'); setShowTemplates(true); } },
                    { label: 'Download', icon: Download, onClick: () => downloadSelfSign(record.id, { index, fallbackName: doc.name }).catch((e) => showToast('error', e.message)) },
                    { label: 'Remove', icon: Trash2, danger: true, hidden: documents.length <= 1, onClick: () => setRemoving(doc) }
                  ]}
                />
              ))}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer?.files || []);
                  if (files.length > 0) runAddToRecord(files.map((file) => ({ name: file.name, file })));
                }}
                className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 hover:border-[#007355] hover:bg-emerald-50/60 transition grid place-items-center text-center p-4 min-h-[190px]"
              >
                <button type="button" onClick={() => addInputRef.current?.click()} className="cursor-pointer">
                  <Upload size={22} className="mx-auto text-slate-400" />
                  <span className="block mt-2 text-xs font-bold text-slate-700">Add more documents</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Drop files here, or choose from this device</span>
                </button>
              </div>
            </div>

            <p role="note" className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
              <Info size={14} className="shrink-0 mt-0.5 text-slate-400" />
              <span>
                Select two or more documents and use <strong>Merge</strong> to turn them into a single file. Merged pages
                become page images, so their text is no longer selectable; the originals are kept untouched.
              </span>
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(1)}>Back</Button>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button
                  variant="secondary"
                  icon={Check}
                  onClick={async () => {
                    await saveTitle();
                    showToast('success', 'Saved. The document is in your Documents tab.');
                    navigate(`/sign-yourself/doc/${record.id}`);
                  }}
                >
                  Finish here (document only)
                </Button>
                <Button icon={ArrowRight} onClick={async () => { await saveTitle(); setStep(3); }}>Next: prepare fields</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ---------------------------------------------------------- step 3 */}
      {!loading && step === 3 && record && (
        <Card
          title="Step 3 · Prepare fields"
          description="Fields are optional. Add them only when you want to sign this document."
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
              <span className="w-11 h-11 rounded-xl bg-white text-[#007355] grid place-items-center shadow-sm"><PenTool size={21} /></span>
              <h3 className="mt-3 text-sm font-extrabold text-slate-900">Place fields and sign it</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Opens the same editor &quot;Send for signatures&quot; uses. Drop a signature, initial, date, full name,
                stamp or any other field onto the page, then choose <strong>Sign &amp; finish</strong>.
              </p>
              <Button className="mt-4" icon={ArrowRight} onClick={() => navigate(`/sign-yourself/prepare/${record.documentId}`)}>
                Open the field editor
              </Button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <span className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 grid place-items-center"><FileText size={21} /></span>
              <h3 className="mt-3 text-sm font-extrabold text-slate-900">I only needed the document</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Finish without any fields. The document stays in the <strong>Documents</strong> tab, ready to download or
                to prepare later - it is never counted as signed.
              </p>
              <Button
                className="mt-4"
                variant="secondary"
                icon={CheckCircle2}
                onClick={() => navigate(`/sign-yourself/doc/${record.id}`)}
              >
                Finish without fields
              </Button>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(2)}>Back</Button>
          </div>
        </Card>
      )}

      {/* ---------------------------------------------------------- dialogs */}
      <input
        ref={replaceInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) replaceWithFile(file);
        }}
      />
      <input
        ref={addInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = '';
          if (files.length > 0) runAddToRecord(files.map((file) => ({ name: file.name, file })));
        }}
      />

      <TemplatePickerModal
        open={showTemplates}
        mode={templateMode}
        onClose={() => {
          setShowTemplates(false);
          setReplaceTarget(null);
        }}
        onConfirm={(templates) => {
          if (templateMode === 'replace') {
            setShowTemplates(false);
            applyTemplateReplace(templatesToDocuments(templates)[0]);
            templates.forEach(countTemplateUse);
            return;
          }
          if (record) {
            setShowTemplates(false);
            const docs = templatesToDocuments(templates);
            templates.forEach(countTemplateUse);
            runAddToRecord(docs.map((d) => ({ name: d.name, documentText: d.documentText })));
            return;
          }
          addTemplates(templates);
        }}
        title={templateMode === 'replace' ? 'Replace this document with a template' : 'Add documents from templates'}
      />

      {blankDraft && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-stretch sm:items-center justify-center sm:p-4" onClick={() => setBlankDraft(null)}>
          <div role="dialog" aria-modal="true" aria-label="Write a new document" onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-4xl sm:rounded-2xl shadow-2xl flex flex-col max-h-full sm:max-h-[92vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-emerald-50 text-[#007355] grid place-items-center"><FilePlus2 size={18} /></span>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Write a new document</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Type the text now; you can keep editing it in the field editor.</p>
                </div>
              </div>
              <button type="button" onClick={() => setBlankDraft(null)} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <Field label="Document name" required>
                <input value={blankDraft.name} onChange={(e) => setBlankDraft({ ...blankDraft, name: e.target.value })} className={inputClass} />
              </Field>
              {/* Not wrapped in <Field>: a label around an editable area steals clicks from the toolbar */}
              <div className="block text-xs">
                <span className="block font-bold text-slate-700 mb-1">Text</span>
                <RichTextField
                  value={blankDraft.documentText}
                  onChange={(html) => setBlankDraft((prev) => (prev ? { ...prev, documentText: html } : prev))}
                  placeholder={'DECLARATION\n\nI, [Your name], confirm that...'}
                  minHeight={300}
                  ariaLabel="Document text"
                />
                <span className="block text-[11px] text-slate-400 mt-1">
                  Use the toolbar for font, size, bold, colours, alignment and lists - the formatting stays on the document.
                </span>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setBlankDraft(null)}>Cancel</Button>
              <Button disabled={!blankDraft.name.trim()} onClick={confirmBlank}>Add this document</Button>
            </div>
          </div>
        </div>
      )}

      <MergeModal
        open={showMerge}
        onClose={() => setShowMerge(false)}
        documents={documents}
        selectedIds={selectedIds}
        onConfirm={runMerge}
        busy={busy}
      />
      <RenameModal
        open={Boolean(renaming)}
        onClose={() => setRenaming(null)}
        title="Rename this document"
        label="File name"
        value={renaming?.name}
        onConfirm={runRenameDocument}
        busy={busy}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove this document?"
        message={`"${removing?.name || ''}" is removed from this self-sign document, together with the fields placed on it.`}
        confirmLabel="Remove"
        danger
        busy={busy}
        onConfirm={runRemove}
        onCancel={() => setRemoving(null)}
      />
      {toast}
    </div>
  );
}
