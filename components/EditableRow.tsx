import { Check, X, Pencil } from 'lucide-react'

interface EditableRowProps {
  label: string
  icon: React.ReactNode
  value: string
  isAdmin: boolean
  fieldKey: string
  editField: string | null
  editVal: string
  saving: boolean
  placeholder: string
  onEdit: (key: string, val: string) => void
  onSave: (key: string, val: string) => void
  onCancel: () => void
  onEditValChange: (v: string) => void
}

export default function EditableRow({
  label, icon, value, isAdmin, fieldKey,
  editField, editVal, saving, placeholder,
  onEdit, onSave, onCancel, onEditValChange,
}: EditableRowProps) {
  const isEditing = editField === fieldKey
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-slate-400 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
        {isEditing ? (
          <div className="flex items-center gap-2 mt-0.5">
            <input
              value={editVal}
              onChange={e => onEditValChange(e.target.value)}
              placeholder={placeholder}
              autoFocus
              className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button onClick={() => onSave(fieldKey, editVal)} disabled={saving}
              className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Check size={12}/>
            </button>
            <button onClick={onCancel} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
              <X size={12}/>
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-800 truncate">
            {value || <span className="text-slate-400 italic">Not set</span>}
          </p>
        )}
      </div>
      {isAdmin && !isEditing && (
        <button onClick={() => onEdit(fieldKey, value ?? '')}
          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg flex-shrink-0">
          <Pencil size={12}/>
        </button>
      )}
    </div>
  )
}
