import React, { useState } from 'react';
import {
  Users2,
  Plus,
  Shield,
  Key,
  Check,
  X,
  Phone,
  Mail,
  Lock,
} from 'lucide-react';
import { StaffMember, UserRole } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';

export interface StaffRolesViewProps {
  staffList: StaffMember[];
  propertyId: string;
  onAddStaff: (staff: Omit<StaffMember, 'id'>) => Promise<void>;
  onUpdateStaff: (staffId: string, changes: Partial<StaffMember>) => Promise<void>;
  onUpdateStaffStatus: (staffId: string, status: StaffMember['status']) => Promise<void>;
}

export const StaffRolesView: React.FC<StaffRolesViewProps> = ({
  staffList,
  propertyId,
  onAddStaff,
  onUpdateStaff,
  onUpdateStaffStatus,
}) => {
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [role, setRole] = useState<UserRole>('Front Desk Agent');
  const handleSave = async () => {
    if (!name || !email) {
      showToast({ title: 'Missing Info', description: 'Name and email are required.', type: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      if (editingStaff) {
        await onUpdateStaff(editingStaff.id, { name, email, phone, role });
      } else {
        await onAddStaff({ name, email, phone, role, assignedPropertyId: propertyId, status: 'Active' });
      }
      setIsModalOpen(false);
      setEditingStaff(null);
      setName('');
      setEmail('');
    } catch (error) {
      showToast({ title: 'Staff save failed', description: error instanceof Error ? error.message : 'Please try again.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setName(staff.name);
    setEmail(staff.email);
    setPhone(staff.phone);
    setRole(staff.role);
    setIsModalOpen(true);
  };

  const openAdd = () => {
    setEditingStaff(null);
    setName('');
    setEmail('');
    setPhone('');
    setRole('Front Desk Agent');
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold tracking-tight text-gray-950 font-sans">
              Staff Directory & Role-Based Access Control (RBAC)
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manage hotel team permissions, terminal PIN codes, and operational responsibilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMatrix(!showMatrix)}
            leftIcon={<Shield className="w-3.5 h-3.5 text-purple-600" />}
          >
            {showMatrix ? 'Hide Permissions Matrix' : 'View Permissions Matrix'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openAdd}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Staff Member
          </Button>
        </div>
      </div>

      {/* Permissions Matrix */}
      {showMatrix && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-3 text-xs overflow-x-auto">
          <h3 className="text-sm font-bold text-gray-900">Role Capabilities Matrix</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b text-[10px] uppercase text-gray-500">
                <th className="p-2.5">Module / Feature</th>
                <th className="p-2.5 text-center">Owner / GM</th>
                <th className="p-2.5 text-center">Front Desk</th>
                <th className="p-2.5 text-center">Housekeeper</th>
                <th className="p-2.5 text-center">Maintenance</th>
                <th className="p-2.5 text-center">Night Auditor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { mod: 'Reservations & Check-in', gm: true, fd: true, hk: false, mt: false, na: true },
                { mod: 'Rate Overrides & Discounts', gm: true, fd: false, hk: false, mt: false, na: false },
                { mod: 'Housekeeping Statuses', gm: true, fd: true, hk: true, mt: false, na: false },
                { mod: 'Maintenance Orders', gm: true, fd: true, hk: true, mt: true, na: false },
                { mod: 'Folio Settle & Invoicing', gm: true, fd: true, hk: false, mt: false, na: true },
                { mod: 'Night Audit Shift Close', gm: true, fd: false, hk: false, mt: false, na: true },
                { mod: 'Channel Manager Markup', gm: true, fd: false, hk: false, mt: false, na: false },
              ].map((row) => (
                <tr key={row.mod}>
                  <td className="p-2.5 font-medium text-gray-800">{row.mod}</td>
                  <td className="p-2.5 text-center">{row.gm ? <Check className="w-4 h-4 text-emerald-600 inline" /> : <X className="w-4 h-4 text-gray-300 inline" />}</td>
                  <td className="p-2.5 text-center">{row.fd ? <Check className="w-4 h-4 text-emerald-600 inline" /> : <X className="w-4 h-4 text-gray-300 inline" />}</td>
                  <td className="p-2.5 text-center">{row.hk ? <Check className="w-4 h-4 text-emerald-600 inline" /> : <X className="w-4 h-4 text-gray-300 inline" />}</td>
                  <td className="p-2.5 text-center">{row.mt ? <Check className="w-4 h-4 text-emerald-600 inline" /> : <X className="w-4 h-4 text-gray-300 inline" />}</td>
                  <td className="p-2.5 text-center">{row.na ? <Check className="w-4 h-4 text-emerald-600 inline" /> : <X className="w-4 h-4 text-gray-300 inline" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Staff Members List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
              <th className="p-3">Staff Name</th>
              <th className="p-3">Assigned Role</th>
              <th className="p-3">Contact Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Terminal PIN</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staffList.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="p-3 font-bold text-gray-950">{s.name}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                    {s.role}
                  </span>
                </td>
                <td className="p-3 text-gray-600 font-mono text-[11px]">{s.email}</td>
                <td className="p-3 text-gray-600 font-mono text-[11px]">{s.phone}</td>
                <td className="p-3 font-mono text-gray-400">••••</td>
                <td className="p-3">
                  <Badge variant="status" status={s.status} size="sm" dot />
                </td>
                <td className="p-3 text-right">
                  <Button size="xs" variant="ghost" onClick={() => openEdit(s)}>Edit</Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={async () => {
                      const newStatus = s.status === 'Active' ? 'Inactive' : 'Active';
                      try {
                        await onUpdateStaffStatus(s.id, newStatus);
                      } catch (error) {
                        showToast({ title: 'Status update failed', description: error instanceof Error ? error.message : 'Please try again.', type: 'error' });
                      }
                    }}
                  >
                    {s.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="md"
        title={editingStaff ? 'Edit Team Member' : 'Add Hotel Team Member'}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingStaff ? 'Save Changes' : 'Add Staff'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <Input
            label="Full Name *"
            placeholder="e.g. Ramesh Kumar"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Work Email *"
              placeholder="ramesh@apkainn.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Mobile Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Role Assignment"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              options={[
                { value: 'Front Desk Agent', label: 'Front Desk Agent' },
                { value: 'Housekeeper', label: 'Housekeeper' },
                { value: 'Maintenance', label: 'Engineering / Maintenance' },
                { value: 'Night Auditor', label: 'Night Auditor' },
                { value: 'Accountant', label: 'Hotel Accountant' },
                { value: 'Owner / GM', label: 'Owner / General Manager' },
              ]}
            />

          </div>
        </div>
      </Modal>
    </div>
  );
};
