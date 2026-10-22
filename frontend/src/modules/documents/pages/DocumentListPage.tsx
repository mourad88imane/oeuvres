import { useState, useRef, useCallback } from "react";
import {
  Upload, Download, Trash2, Search, FileText, FolderOpen,
  X, Loader2, File,
} from "lucide-react";
import { clsx } from "clsx";
import {
  useDocuments, useDocumentCategories, useUploadDocument,
  useDeleteDocument,
} from "../api/index";
import {
  Spinner, Modal, ConfirmDialog, Badge, EmptyState,
  Field, inputCls, useToast,
} from "@shared/components/ui/index";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";

const CATEGORIES = [
  { value: "", label: "Tous" },
  { value: "Général", label: "Général" },
  { value: "Contrat", label: "Contrat" },
  { value: "Rapport", label: "Rapport" },
  { value: "Facture", label: "Facture" },
  { value: "Médical", label: "Médical" },
  { value: "Administratif", label: "Administratif" },
  { value: "Autre", label: "Autre" },
];

const CATEGORY_VARIANTS: Record<string, "default" | "success" | "warning" | "error" | "info" | "purple"> = {
  Général: "default",
  Contrat: "info",
  Rapport: "purple",
  Facture: "warning",
  Médical: "error",
  Administratif: "default",
  Autre: "default",
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 o";
  const k = 1024;
  const sizes = ["o", "Ko", "Mo", "Go"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DocumentListPage() {
  const toast = useToast();
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: documents, isLoading } = useDocuments({
    category: category || undefined,
    search: search || undefined,
  });

  const { data: apiCategories } = useDocumentCategories();

  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  const mergedCategories = CATEGORIES.map((c) => {
    if (c.value && apiCategories && !apiCategories.includes(c.value)) {
      const exists = apiCategories.includes(c.value);
      if (!exists && c.value !== "Tous") return null;
    }
    return c;
  }).filter(Boolean) as typeof CATEGORIES;

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => {
        toast.success("Document supprimé", "Le document a été supprimé avec succès");
        setDeleteTarget(null);
      },
      onError: () => {
        toast.error("Erreur", "Impossible de supprimer le document");
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand/10">
            <FolderOpen className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Gestion des documents</h1>
            <p className="text-sm text-gray-500 mt-0.5">Ajoutez, consultez et gérez vos documents</p>
          </div>
        </div>
        <RoleGuard roles={["admin", "gestionnaire", "comptable"]}>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-[#1a1917] font-bold text-sm hover:brightness-95"
          >
            <Upload className="w-4 h-4" />
            Importer un document
          </button>
        </RoleGuard>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg flex-wrap">
          {mergedCategories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={clsx(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                category === cat.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un document..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>

      {/* Document table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center">
            <Spinner />
          </div>
        ) : !documents?.length ? (
          <EmptyState
            icon={FileText}
            title="Aucun document"
            description="Importez votre premier document pour commencer"
            action={
              <RoleGuard roles={["admin", "gestionnaire", "comptable"]}>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-[#1a1917] font-bold text-sm hover:brightness-95"
                >
                  <Upload className="w-4 h-4" />
                  Importer un document
                </button>
              </RoleGuard>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Titre</th>
                  <th className="text-left px-4 py-3">Catégorie</th>
                  <th className="text-right px-4 py-3">Taille</th>
                  <th className="text-right px-4 py-3">Ajouté le</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-brand/10 shrink-0">
                          <File className="w-4 h-4 text-brand" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-[300px]">
                            {doc.title}
                          </p>
                          {doc.description && (
                            <p className="text-xs text-gray-500 truncate max-w-[300px]">
                              {doc.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={CATEGORY_VARIANTS[doc.category] || "default"}>
                        {doc.category || "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatFileSize(doc.file_size)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {formatDate(doc.uploaded_at || doc.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => window.open(doc.file, "_blank")}
                          className="p-2 rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-colors"
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <RoleGuard roles={["admin"]}>
                          <button
                            onClick={() => setDeleteTarget(doc.id)}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </RoleGuard>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload modal */}
      <UploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        categories={apiCategories || []}
        onUpload={(formData) =>
          uploadMutation.mutate(formData, {
            onSuccess: () => {
              toast.success("Document importé", "Le document a été ajouté avec succès");
              setShowUploadModal(false);
            },
            onError: () => {
              toast.error("Erreur", "Impossible d'importer le document");
            },
          })
        }
        loading={uploadMutation.isPending}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer le document"
        message="Êtes-vous sûr de vouloir supprimer ce document ? Cette action est réversible."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function UploadModal({
  open, onClose, categories, onUpload, loading,
}: {
  open: boolean;
  onClose: () => void;
  categories: string[];
  onUpload: (formData: FormData) => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setTitle("");
    setCategory("");
    setDescription("");
    setTags("");
    setFile(null);
    setDragOver(false);
  }, []);

  const handleSubmit = () => {
    if (!file || !title.trim()) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title.trim());
    if (category) fd.append("category", category);
    if (description.trim()) fd.append("description", description.trim());
    if (tags.trim()) fd.append("tags", tags.trim());
    onUpload(fd);
  };

  const handleClose = () => {
    if (!loading) reset();
    onClose();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  const availableCategories = categories.length > 0
    ? CATEGORIES.filter((c) => !c.value || categories.includes(c.value))
    : CATEGORIES;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Importer un document"
      size="lg"
      footer={
        <>
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm border rounded-xl disabled:opacity-50 transition-colors font-bold"
            style={{
              borderColor: "rgba(0,0,0,0.08)",
              color: "#4d4b46",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.03)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !file || !title.trim()}
            className="px-4 py-2 text-sm rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 bg-brand text-[#1a1917] hover:brightness-95"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Importer
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
            dragOver ? "border-brand bg-brand/5" : "border-gray-200 hover:border-gray-300"
          )}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <File className="w-8 h-8 text-brand" />
              <div className="text-left">
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="p-1 rounded-lg text-gray-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">
                Glissez-déposez un fichier ici ou cliquez pour parcourir
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, images — 20 Mo max</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        {/* Title */}
        <Field label="Titre" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du document"
            className={inputCls()}
          />
        </Field>

        {/* Category */}
        <Field label="Catégorie">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls()}
          >
            <option value="">Sélectionner une catégorie</option>
            {availableCategories.filter((c) => c.value).map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </Field>

        {/* Description */}
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description facultative"
            rows={3}
            className={inputCls()}
          />
        </Field>

        {/* Tags */}
        <Field label="Tags" hint="Séparés par des virgules">
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="ex: budget, 2024, important"
            className={inputCls()}
          />
        </Field>
      </div>
    </Modal>
  );
}
