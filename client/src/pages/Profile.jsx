import { useState } from 'react';
import { toast } from 'react-toastify';
import { User, Key, Camera, Mail, Calendar } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { roleStyle, titleCase, formatDateTime } from '../lib/ui';
import { Badge } from '../components/ui';
import { cn } from '../lib/utils';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [file, setFile] = useState(null);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      if (file) fd.append('profilePicture', file);
      const { data } = await api.patch('/auth/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser(data.data);
      setFile(null);
      toast.success('Profile details updated successfully');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    try {
      await api.patch('/auth/password', pw);
      setPw({ currentPassword: '', newPassword: '' });
      toast.success('Password changed successfully');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Profile Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your personal details, profile picture, and account security.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Details Form */}
        <form onSubmit={saveProfile} className="card p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2 border-b pb-3">
              <User className="h-4 w-4 text-muted-foreground" />
              Personal Details
            </h3>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative group shrink-0">
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt={user.name} className="h-16 w-16 rounded-full border object-cover shadow-sm" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground text-2xl border shadow-sm">
                    {user.name.charAt(0)}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground leading-none">{user.name}</span>
                  <Badge className={cn("border font-normal text-[10px] py-0 px-1.5", roleStyle[user.role])}>
                    {titleCase(user.role)}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  Last login: {formatDateTime(user.lastLogin)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="label">Full Name</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your full name"
                />
              </div>
              
              <div className="space-y-1">
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  <input
                    className="input pl-9 bg-muted/50 cursor-not-allowed"
                    value={user.email}
                    disabled
                    title="Email cannot be changed"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="label">Update Profile Picture</label>
                <input
                  type="file"
                  accept="image/*"
                  className="input file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/95 cursor-pointer"
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </div>
            </div>
          </div>
          
          <button className="btn-primary mt-6 w-full sm:w-auto" disabled={busy}>
            {busy ? 'Saving Details…' : 'Save Details'}
          </button>
        </form>

        {/* Change Password Form */}
        <form onSubmit={changePassword} className="card p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2 border-b pb-3">
              <Key className="h-4 w-4 text-muted-foreground" />
              Update Authentication Password
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="label">Current Password</label>
                <input
                  type="password"
                  className="input"
                  value={pw.currentPassword}
                  onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                  required
                  placeholder="••••••••"
                />
              </div>
              
              <div className="space-y-1">
                <label className="label">New Security Password</label>
                <input
                  type="password"
                  minLength={6}
                  className="input"
                  value={pw.newPassword}
                  onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                  required
                  placeholder="Min 6 characters"
                />
              </div>
            </div>
          </div>
          
          <button className="btn-primary mt-6 w-full sm:w-auto">
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
