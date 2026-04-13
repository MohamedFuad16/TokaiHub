import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft, Search, Database, Plus, Pencil, Trash2,
  Eye, Filter, Loader2, CheckCircle, AlertTriangle, X, ChevronDown,
} from 'lucide-react';
import { ScreenProps } from '../App';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { adminBrowse, adminAddItem, adminEditItem, adminDeleteItem, type DbItem } from '../lib/api';

// DbItem type imported from lib/api.ts

type Tab = 'browse' | 'edit' | 'add' | 'delete';

// ─── i18n ────────────────────────────────────────────────────────────────────

const t = {
  en: {
    title: 'Database Manager',
    browse: 'Browse',
    edit: 'Edit',
    add: 'Add',
    delete: 'Delete',
    searchPh: 'Search by PK, SK, or value…',
    filterAll: 'All',
    filterClassGroup: 'CLASSGROUP#',
    filterCourse: 'COURSE#',
    filterCustom: 'Custom prefix…',
    noItems: 'No items found. Connect a Lambda to fetch data.',
    loadData: 'Load Data',
    loading: 'Fetching records…',
    pk: 'Partition Key (PK)',
    sk: 'Sort Key (SK)',
    pkPh: 'e.g. COURSE#TTK085',
    skPh: 'e.g. METADATA',
    addField: '+ Add Field',
    fieldKey: 'Key',
    fieldValue: 'Value',
    saveChanges: 'Save Changes',
    addItem: 'Add Item',
    deleteItem: 'Delete Item',
    deleteConfirm: 'Are you sure you want to delete this item? This action cannot be undone.',
    confirmDelete: 'Yes, Delete',
    cancelDelete: 'Cancel',
    selectItem: 'Select an item from Browse to edit or delete it.',
    saved: 'Changes saved successfully!',
    added: 'Item added successfully!',
    deleted: 'Item deleted successfully!',
    noApi: 'API not connected yet',
  },
  jp: {
    title: 'データベース管理',
    browse: '閲覧',
    edit: '編集',
    add: '追加',
    delete: '削除',
    searchPh: 'PK、SK、または値で検索…',
    filterAll: 'すべて',
    filterClassGroup: 'CLASSGROUP#',
    filterCourse: 'COURSE#',
    filterCustom: 'カスタムプレフィックス…',
    noItems: 'アイテムが見つかりません。Lambdaを接続してデータを取得してください。',
    loadData: 'データを読み込む',
    loading: 'レコードを取得中…',
    pk: 'パーティションキー (PK)',
    sk: 'ソートキー (SK)',
    pkPh: '例: COURSE#TTK085',
    skPh: '例: METADATA',
    addField: '+ フィールド追加',
    fieldKey: 'キー',
    fieldValue: '値',
    saveChanges: '変更を保存',
    addItem: 'アイテム追加',
    deleteItem: 'アイテム削除',
    deleteConfirm: 'このアイテムを削除しますか？この操作は元に戻せません。',
    confirmDelete: 'はい、削除します',
    cancelDelete: 'キャンセル',
    selectItem: '閲覧からアイテムを選択して編集または削除してください。',
    saved: '変更が保存されました！',
    added: 'アイテムが追加されました！',
    deleted: 'アイテムが削除されました！',
    noApi: 'APIはまだ接続されていません',
  },
};

// No mock data — items are fetched from DynamoDB via /testDB Lambda

// ─── Animation variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Tabs configuration ─────────────────────────────────────────────────────

const TABS: { id: Tab; icon: typeof Eye }[] = [
  { id: 'browse', icon: Eye },
  { id: 'edit', icon: Pencil },
  { id: 'add', icon: Plus },
  { id: 'delete', icon: Trash2 },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminDatabase({ lang, settings }: ScreenProps) {
  const navigate = useNavigate();
  const isDark = settings.isDarkMode;
  const tx = t[lang];

  // State
  const [activeTab, setActiveTab] = useState<Tab>('browse');
  const [items, setItems] = useState<DbItem[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPrefix, setFilterPrefix] = useState('');
  const [customPrefix, setCustomPrefix] = useState('');
  const [selectedItem, setSelectedItem] = useState<DbItem | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Add form state
  const [newPK, setNewPK] = useState('');
  const [newSK, setNewSK] = useState('');
  const [newFields, setNewFields] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);

  // Edit form state
  const [editFields, setEditFields] = useState<{ key: string; value: string }[]>([]);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Theme tokens
  const accent = 'blue-500';
  const accentDark = 'blue-400';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const inputBg = isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-100 text-brand-black placeholder-gray-400';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  // Filtered items
  const filteredItems = useMemo(() => {
    let result = items;
    const prefix = filterPrefix || customPrefix;
    if (prefix) {
      result = result.filter(item => item.PK.startsWith(prefix));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.PK.toLowerCase().includes(q) ||
        item.SK.toLowerCase().includes(q) ||
        Object.values(item).some(v => String(v).toLowerCase().includes(q))
      );
    }
    return result;
  }, [items, filterPrefix, customPrefix, searchQuery]);

  // Available PK prefixes (derived from data)
  const prefixes = useMemo(() => {
    const set = new Set<string>();
    items.forEach(item => {
      const hash = item.PK.indexOf('#');
      if (hash > 0) set.add(item.PK.slice(0, hash + 1));
    });
    return Array.from(set).sort();
  }, [items]);

  // Select item for edit/delete
  const handleSelectItem = useCallback((item: DbItem) => {
    setSelectedItem(item);
    setEditFields(
      Object.entries(item)
        .filter(([k]) => k !== 'PK' && k !== 'SK')
        .map(([key, value]) => ({ key, value: JSON.stringify(value) }))
    );
    setShowDeleteConfirm(false);
  }, []);

  // Flash success message
  const flashSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 2500);
  }, []);

  // Fetch items from DynamoDB via /testDB Lambda
  const handleLoadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const prefix = filterPrefix || customPrefix || undefined;
      const search = searchQuery.trim() || undefined;
      const data = await adminBrowse({ pk: prefix, search });
      setItems(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [filterPrefix, customPrefix, searchQuery]);

  // Save edited item via PUT /testDB?action=edit
  const handleSaveEdit = useCallback(async () => {
    if (!selectedItem) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const updated: DbItem = { PK: selectedItem.PK, SK: selectedItem.SK };
      editFields.forEach(f => {
        if (f.key.trim()) {
          try { updated[f.key] = JSON.parse(f.value); } catch { updated[f.key] = f.value; }
        }
      });
      await adminEditItem(updated);
      setItems(prev => prev.map(i => (i.PK === updated.PK && i.SK === updated.SK ? updated : i)));
      setSelectedItem(updated);
      flashSuccess(tx.saved);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save changes');
    } finally {
      setIsLoading(false);
    }
  }, [selectedItem, editFields, tx.saved, flashSuccess]);

  // Add new item via POST /testDB?action=add
  const handleAddItem = useCallback(async () => {
    if (!newPK.trim() || !newSK.trim()) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const newItem: DbItem = { PK: newPK, SK: newSK };
      newFields.forEach(f => {
        if (f.key.trim()) {
          try { newItem[f.key] = JSON.parse(f.value); } catch { newItem[f.key] = f.value; }
        }
      });
      await adminAddItem(newItem);
      setItems(prev => [...prev, newItem]);
      setNewPK('');
      setNewSK('');
      setNewFields([{ key: '', value: '' }]);
      flashSuccess(tx.added);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add item');
    } finally {
      setIsLoading(false);
    }
  }, [newPK, newSK, newFields, tx.added, flashSuccess]);

  // Delete item via DELETE /testDB?action=delete
  const handleDeleteItem = useCallback(async () => {
    if (!selectedItem) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      await adminDeleteItem(selectedItem.PK, selectedItem.SK);
      setItems(prev => prev.filter(i => !(i.PK === selectedItem.PK && i.SK === selectedItem.SK)));
      setSelectedItem(null);
      setShowDeleteConfirm(false);
      flashSuccess(tx.deleted);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete item');
    } finally {
      setIsLoading(false);
    }
  }, [selectedItem, tx.deleted, flashSuccess]);

  return (
    <div className="h-full relative flex flex-col">

      {/* Header */}
      <header
        style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))' }}
        className="flex justify-between items-center p-4 sm:p-6 shrink-0 max-w-4xl w-full mx-auto"
      >
        <div className="flex items-center gap-3">
          <Database className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <h1 className="text-[22px] sm:text-[28px] font-bold tracking-tight">{tx.title}</h1>
        </div>
        <button
          onClick={() => navigate('/settings')}
          aria-label="Go back"
          className={`w-11 h-11 rounded-full border ${borderClass} flex items-center justify-center transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} active:scale-95`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </header>

      {/* Tab bar */}
      <div className="px-4 sm:px-6 max-w-4xl w-full mx-auto">
        <div className={`flex gap-1 p-1 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? `bg-blue-500 text-white shadow-lg shadow-blue-500/30`
                    : `${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`
                }`}
              >
                <Icon className="w-4 h-4" />
                {tx[tab.id]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Success banner */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 sm:mx-6 mt-3 max-w-4xl w-full sm:mx-auto"
          >
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-green-500/10 border border-green-500/20">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              <span className="text-green-500 text-sm font-bold">{successMsg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error banner */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 sm:mx-6 mt-2 max-w-4xl w-full sm:mx-auto"
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-red-500 text-sm font-bold truncate">{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg('')} className="text-red-400 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        <div className="max-w-4xl w-full mx-auto">

          {/* ── Browse Tab ──────────────────────────────────────────────── */}
          {activeTab === 'browse' && (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">

              {/* Search bar */}
              <motion.div variants={itemVariants}>
                <div className={`relative flex items-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-2xl px-4 py-3`}>
                  <Search className={`w-5 h-5 ${textMuted} mr-3 shrink-0`} />
                  <input
                    type="text"
                    placeholder={tx.searchPh}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-sm font-medium"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className={`ml-2 ${textMuted}`}>
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>

              {/* Filter pills */}
              <motion.div variants={itemVariants} className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button
                  onClick={() => { setFilterPrefix(''); setCustomPrefix(''); }}
                  className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    !filterPrefix && !customPrefix
                      ? 'bg-blue-500 text-white shadow-md'
                      : `border ${borderClass} ${isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-50'}`
                  }`}
                >
                  {tx.filterAll}
                </button>
                {prefixes.map(p => (
                  <button
                    key={p}
                    onClick={() => { setFilterPrefix(p); setCustomPrefix(''); }}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                      filterPrefix === p
                        ? 'bg-blue-500 text-white shadow-md'
                        : `border ${borderClass} ${isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-50'}`
                    }`}
                  >
                    {p}
                  </button>
                ))}
                {/* Custom prefix input */}
                <div className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-xl border ${borderClass} ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                  <Filter className={`w-3 h-3 ${textMuted}`} />
                  <input
                    type="text"
                    placeholder={tx.filterCustom}
                    value={customPrefix}
                    onChange={e => { setCustomPrefix(e.target.value); setFilterPrefix(''); }}
                    className="bg-transparent border-none outline-none text-xs font-mono font-bold w-28"
                  />
                </div>
              </motion.div>

              {/* Load data button */}
              <motion.div variants={itemVariants}>
                <button
                  onClick={handleLoadData}
                  disabled={isLoading}
                  className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-2 border-dashed ${
                    isDark ? 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10' : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                  } ${isLoading ? 'opacity-60 cursor-wait' : ''}`}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  {isLoading ? tx.loading : tx.loadData}
                </button>
              </motion.div>

              {/* Items list */}
              <motion.div variants={containerVariants} className="space-y-2">
                {filteredItems.map((item, idx) => (
                  <motion.div
                    key={`${item.PK}-${item.SK}-${idx}`}
                    variants={itemVariants}
                    onClick={() => handleSelectItem(item)}
                    className={`${cardBg} border ${borderClass} rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${
                      selectedItem?.PK === item.PK && selectedItem?.SK === item.SK
                        ? `ring-2 ring-blue-500 ${isDark ? 'bg-blue-500/5' : 'bg-blue-50'}`
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            item.PK.startsWith('COURSE#')
                              ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                              : isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {item.PK.split('#')[0]}
                          </span>
                        </div>
                        <p className="font-mono font-bold text-sm truncate">{item.PK}</p>
                        <p className={`font-mono text-xs ${textMuted} truncate`}>SK: {item.SK}</p>
                      </div>
                      <div className={`text-xs font-bold ${textMuted}`}>
                        {Object.keys(item).length - 2} fields
                      </div>
                    </div>
                    {/* Preview attributes */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Object.entries(item)
                        .filter(([k]) => k !== 'PK' && k !== 'SK')
                        .slice(0, 3)
                        .map(([k, v]) => (
                          <span
                            key={k}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-md truncate max-w-[140px] ${
                              isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {k}: {String(v)}
                          </span>
                        ))}
                    </div>
                  </motion.div>
                ))}
                {filteredItems.length === 0 && (
                  <div className="py-16 text-center">
                    <Database className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                    <p className={`text-sm font-medium ${textMuted}`}>{tx.noItems}</p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* ── Edit Tab ────────────────────────────────────────────────── */}
          {activeTab === 'edit' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {selectedItem ? (
                <>
                  {/* Selected item header */}
                  <div className={`${cardBg} border ${borderClass} rounded-2xl p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Pencil className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className="font-bold text-sm">{lang === 'en' ? 'Editing' : '編集中'}</span>
                    </div>
                    <p className="font-mono font-bold text-sm">{selectedItem.PK}</p>
                    <p className={`font-mono text-xs ${textMuted}`}>SK: {selectedItem.SK}</p>
                  </div>

                  {/* Editable fields */}
                  <div className="space-y-3">
                    {editFields.map((field, idx) => (
                      <div key={idx} className={`${cardBg} border ${borderClass} rounded-2xl p-3 space-y-2`}>
                        <div className="flex items-center justify-between">
                          <label className={`text-xs font-bold ${textMuted}`}>{tx.fieldKey}</label>
                          <button
                            onClick={() => setEditFields(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={field.key}
                          onChange={e => setEditFields(prev => prev.map((f, i) => i === idx ? { ...f, key: e.target.value } : f))}
                          className={`w-full rounded-xl px-3 py-2 text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                        />
                        <label className={`text-xs font-bold ${textMuted}`}>{tx.fieldValue}</label>
                        <textarea
                          value={field.value}
                          onChange={e => setEditFields(prev => prev.map((f, i) => i === idx ? { ...f, value: e.target.value } : f))}
                          rows={2}
                          className={`w-full rounded-xl px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 resize-none ${inputBg}`}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Add field */}
                  <button
                    onClick={() => setEditFields(prev => [...prev, { key: '', value: '' }])}
                    className={`w-full py-3 rounded-2xl border-2 border-dashed ${isDark ? 'border-gray-600 text-gray-400 hover:border-blue-500/50 hover:text-blue-400' : 'border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600'} font-bold text-sm transition-all`}
                  >
                    {tx.addField}
                  </button>

                  {/* Save button */}
                  <motion.button
                    onClick={handleSaveEdit}
                    disabled={isLoading}
                    whileTap={{ scale: 0.97 }}
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-blue-500 text-white shadow-lg shadow-blue-500/30 transition-all ${isLoading ? 'opacity-70 cursor-wait' : 'hover:bg-blue-600'}`}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {tx.saveChanges}
                  </motion.button>
                </>
              ) : (
                <div className="py-20 text-center">
                  <Pencil className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                  <p className={`text-sm font-medium ${textMuted}`}>{tx.selectItem}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Add Tab ─────────────────────────────────────────────────── */}
          {activeTab === 'add' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* PK + SK inputs */}
              <div className={`${cardBg} border ${borderClass} rounded-2xl p-4 space-y-3`}>
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold ml-1 ${textMuted}`}>{tx.pk}</label>
                  <input
                    type="text"
                    value={newPK}
                    onChange={e => setNewPK(e.target.value)}
                    placeholder={tx.pkPh}
                    className={`w-full rounded-xl px-4 py-3 text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold ml-1 ${textMuted}`}>{tx.sk}</label>
                  <input
                    type="text"
                    value={newSK}
                    onChange={e => setNewSK(e.target.value)}
                    placeholder={tx.skPh}
                    className={`w-full rounded-xl px-4 py-3 text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                  />
                </div>
              </div>

              {/* Dynamic fields */}
              <div className="space-y-3">
                {newFields.map((field, idx) => (
                  <div key={idx} className={`${cardBg} border ${borderClass} rounded-2xl p-3`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold ${textMuted}`}>Field {idx + 1}</span>
                      {newFields.length > 1 && (
                        <button onClick={() => setNewFields(prev => prev.filter((_, i) => i !== idx))} className="text-red-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder={tx.fieldKey}
                        value={field.key}
                        onChange={e => setNewFields(prev => prev.map((f, i) => i === idx ? { ...f, key: e.target.value } : f))}
                        className={`rounded-xl px-3 py-2 text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                      />
                      <input
                        type="text"
                        placeholder={tx.fieldValue}
                        value={field.value}
                        onChange={e => setNewFields(prev => prev.map((f, i) => i === idx ? { ...f, value: e.target.value } : f))}
                        className={`rounded-xl px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add field button */}
              <button
                onClick={() => setNewFields(prev => [...prev, { key: '', value: '' }])}
                className={`w-full py-3 rounded-2xl border-2 border-dashed ${isDark ? 'border-gray-600 text-gray-400 hover:border-blue-500/50 hover:text-blue-400' : 'border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600'} font-bold text-sm transition-all`}
              >
                {tx.addField}
              </button>

              {/* Submit */}
              <motion.button
                onClick={handleAddItem}
                disabled={!newPK.trim() || !newSK.trim() || isLoading}
                whileTap={newPK.trim() && newSK.trim() ? { scale: 0.97 } : {}}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-blue-500 text-white shadow-lg shadow-blue-500/30 transition-all ${
                  !newPK.trim() || !newSK.trim() ? 'opacity-40 cursor-not-allowed' : isLoading ? 'opacity-70 cursor-wait' : 'hover:bg-blue-600'
                }`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {tx.addItem}
              </motion.button>
            </motion.div>
          )}

          {/* ── Delete Tab ──────────────────────────────────────────────── */}
          {activeTab === 'delete' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {selectedItem ? (
                <>
                  {/* Selected item display */}
                  <div className={`${cardBg} border-2 ${isDark ? 'border-red-500/20' : 'border-red-200'} rounded-2xl p-4`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Trash2 className="w-4 h-4 text-red-500" />
                      <span className="font-bold text-sm text-red-500">{tx.deleteItem}</span>
                    </div>
                    <p className="font-mono font-bold text-sm">{selectedItem.PK}</p>
                    <p className={`font-mono text-xs ${textMuted} mb-3`}>SK: {selectedItem.SK}</p>

                    {/* All attributes */}
                    <div className="space-y-1.5">
                      {Object.entries(selectedItem)
                        .filter(([k]) => k !== 'PK' && k !== 'SK')
                        .map(([k, v]) => (
                          <div key={k} className={`flex justify-between items-center px-3 py-2 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                            <span className={`text-xs font-bold ${textMuted}`}>{k}</span>
                            <span className="text-xs font-mono truncate max-w-[60%] text-right">{JSON.stringify(v)}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Delete confirmation */}
                  <AnimatePresence>
                    {!showDeleteConfirm ? (
                      <motion.button
                        key="delete-btn"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border-2 border-red-500/20 hover:bg-red-500/20 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        {tx.deleteItem}
                      </motion.button>
                    ) : (
                      <motion.div
                        key="delete-confirm"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`${cardBg} border-2 border-red-500/30 rounded-2xl p-5 text-center space-y-4`}
                      >
                        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
                        <p className="text-sm font-medium">{tx.deleteConfirm}</p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className={`flex-1 py-3 rounded-2xl font-bold text-sm ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-all`}
                          >
                            {tx.cancelDelete}
                          </button>
                          <button
                            onClick={handleDeleteItem}
                            disabled={isLoading}
                            className="flex-1 py-3 rounded-2xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                          >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            {tx.confirmDelete}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <div className="py-20 text-center">
                  <Trash2 className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                  <p className={`text-sm font-medium ${textMuted}`}>{tx.selectItem}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Bottom padding for mobile scroll */}
          <div className="h-20" />
        </div>
      </div>
    </div>
  );
}
