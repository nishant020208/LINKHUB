import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardBody } from '@/components/ui/card';

export const SettingsPage: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
    });
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-4 border-b border-border/40">
        <h2 className="font-display font-bold text-2xl">Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your account preferences and connected services
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div>
              <h3 className="font-semibold text-sm">Account Details</h3>
              <p className="text-xs text-muted-foreground">Your authenticated session information</p>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                {userEmail ? userEmail.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
              </div>
              <div>
                <p className="font-semibold text-sm">{userEmail || 'Active Session'}</p>
                <p className="text-xs text-muted-foreground">Authenticated via Supabase</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <h3 className="font-semibold text-sm">Privacy & Security</h3>
              <p className="text-xs text-muted-foreground">Review data protection and permission controls</p>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                UnifyHub is committed to your data privacy. All data is read-only, stored with Row-Level Security, and refresh tokens are encrypted at rest.
              </p>
              <div className="flex items-center gap-3">
                <Link
                  to="/privacy"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Read Full Privacy Policy
                </Link>
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-border/60 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                >
                  Google Permissions
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
