'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Stats {
  projectsCount: number;
  businessesCount: number;
  adminsCount: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/projects', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/admin/users', { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([projectsData, usersData]) => {
        const businessesCount = projectsData.projects?.reduce(
          (sum: number, p: any) => sum + (p.businessCount || 0),
          0
        ) || 0;

        setStats({
          projectsCount: projectsData.projects?.length || 0,
          businessesCount,
          adminsCount: usersData.admins?.length || 0,
        });
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load stats:', error);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your local business directory</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{stats?.projectsCount || 0}</CardTitle>
            <CardDescription>Total Projects</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/projects">
              <Button variant="outline" size="sm">View Projects</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{stats?.businessesCount || 0}</CardTitle>
            <CardDescription>Total Businesses</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/projects">
              <Button variant="outline" size="sm">Manage Businesses</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{stats?.adminsCount || 0}</CardTitle>
            <CardDescription>Admin Users</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/users">
              <Button variant="outline" size="sm">Manage Users</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Link href="/admin/projects/new">
            <Button>Create New Project</Button>
          </Link>
          <Link href="/admin/projects">
            <Button variant="outline">View All Projects</Button>
          </Link>
          <Link href="/admin/users">
            <Button variant="outline">Manage Admin Users</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
