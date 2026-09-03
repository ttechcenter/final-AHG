import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Profile, Department, UserRole, ROLE_LABELS, SalesCategory } from '../../types';
import {
  Users, Building2, Plus, Trash2, Edit2, Loader2, AlertCircle,
  CheckCircle2, Search, X, ChevronDown, UserCog, Save, ShoppingCart, DollarSign,
} from 'lucide-react';

interface ITAdminDashboardProps {
  profile: Profile;
}

export default function ITAdminDashboard({ profile }: ITAdminDashboardProps) {
  const [tab, setTab] = useState<'users' | 'departments' | 'sales_categories'>('users');
  const [users, setUsers] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [salesCategories, setSalesCategories] = useState<SalesCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit user modal
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('employee');
  const [editDeptId, setEditDeptId] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // New department
  const [newDeptName, setNewDeptName] = useState('');
  const [deptLoading, setDeptLoading] = useState(false);

  // New sales category
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [{ data: u }, { data: d }, { data: sc }] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('sales_categories').select('*').order('name'),
    ]);
    setUsers(u ?? []);
    setDepartments(d ?? []);
    setSalesCategories(sc ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const openEdit = (u: Profile) => {
    setEditUser(u);
    setEditRole(u.role);
    setEditDeptId(u.department_id ?? '');
    setEditFullName(u.full_name);
  };

  const saveUser = async () => {
    if (!editUser) return;
    setEditLoading(true);
    const selectedDept = departments.find((d) => d.id === editDeptId);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editFullName.trim(),
        role: editRole,
        department_id: editDeptId || null,
        department: selectedDept?.name ?? editUser.department,
      })
      .eq('id', editUser.id);
    if (error) showMsg('error', error.message);
    else {
      showMsg('success', 'User updated.');
      setEditUser(null);
      loadData();
    }
    setEditLoading(false);
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) showMsg('error', error.message);
    else {
      showMsg('success', 'User removed.');
      loadData();
    }
  };

  const addDepartment = async () => {
    if (!newDeptName.trim()) return;
    setDeptLoading(true);
    const { error } = await supabase.from('departments').insert({ name: newDeptName.trim() });
    if (error) showMsg('error', error.message);
    else {
      showMsg('success', 'Department added.');
      setNewDeptName('');
      loadData();
    }
    setDeptLoading(false);
  };

  const deleteDepartment = async (id: string) => {
    if (!confirm('Delete this department?')) return;
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) showMsg('error', error.message);
    else {
      showMsg('success', 'Department removed.');
      loadData();
    }
  };

  const addSalesCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCategoryLoading(true);
    const { error } = await supabase.from('sales_categories').insert({
      name: newCategoryName.trim(),
      description: newCategoryDesc.trim(),
      created_by: profile.id,
    });
    if (error) showMsg('error', error.message);
    else {
      showMsg('success', 'Sales category added.');
      setNewCategoryName('');
      setNewCategoryDesc('');
      loadData();
    }
    setCategoryLoading(false);
  };

  const toggleCategoryActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase.from('sales_categories').update({ is_active: !isActive }).eq('id', id);
    if (error) showMsg('error', error.message);
    else {
      showMsg('success', `Category ${!isActive ? 'activated' : 'deactivated'}.`);
      loadData();
    }
  };

  const deleteSalesCategory = async (id: string) => {
    if (!confirm('Delete this sales category?')) return;
    const { error } = await supabase.from('sales_categories').delete().eq('id', id);
    if (error) showMsg('error', error.message);
    else {
      showMsg('success', 'Sales category removed.');
      loadData();
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || u.department?.toLowerCase() === deptFilter.toLowerCase();
    return matchSearch && matchDept;
  });

  const roleBadge = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      ceo: 'bg-yellow-100 text-yellow-800',
      it_admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      hr: 'bg-purple-100 text-purple-800',
      ceo_office_head: 'bg-orange-100 text-orange-800',
      strategic_advisor: 'bg-teal-100 text-teal-800',
      employee: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[role] ?? 'bg-gray-100 text-gray-600'}`}>
        {ROLE_LABELS[role] ?? role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'users', label: 'Users', icon: <Users size={15} /> },
          { key: 'departments', label: 'Departments', icon: <Building2 size={15} /> },
          { key: 'sales_categories', label: 'Sales Categories', icon: <DollarSign size={15} /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === t.key ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div className="relative">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <span className="text-xs text-gray-400">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-green-600" />
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Role</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-700 text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              u.full_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{u.full_name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.department || '—'}</td>
                      <td className="px-4 py-3">{roleBadge(u.role)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Edit">
                            <Edit2 size={14} />
                          </button>
                          {u.id !== profile.id && (
                            <button onClick={() => deleteUser(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'departments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-3">
            <input
              type="text"
              placeholder="New department name..."
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDepartment()}
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={addDepartment}
              disabled={deptLoading || !newDeptName.trim()}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm shadow"
            >
              {deptLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-green-600" />
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {departments.map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                        <Building2 size={14} className="text-green-700" />
                      </div>
                      <span className="font-semibold text-gray-800 text-sm">{d.name}</span>
                    </div>
                    <button onClick={() => deleteDepartment(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'sales_categories' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Category name (e.g., Product Sales, Service Fees)..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={addSalesCategory}
                disabled={categoryLoading || !newCategoryName.trim()}
                className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-400 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm shadow"
              >
                {categoryLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
              </button>
            </div>
            <textarea
              placeholder="Description (optional)..."
              value={newCategoryDesc}
              onChange={(e) => setNewCategoryDesc(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-green-600" />
              </div>
            ) : salesCategories.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">No sales categories yet. Add one above.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {salesCategories.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-800">{c.name}</td>
                      <td className="px-4 py-3 text-gray-500">{c.description || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => toggleCategoryActive(c.id, c.is_active)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                            title={c.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {c.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button onClick={() => deleteSalesCategory(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-green-800 to-green-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2">
                <UserCog size={18} /> Edit User
              </h3>
              <button onClick={() => setEditUser(null)} className="text-green-200 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Department</label>
                <select
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="">No department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditUser(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={saveUser}
                  disabled={editLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  {editLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
