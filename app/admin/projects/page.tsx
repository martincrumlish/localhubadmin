'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Project {
  id: number;
  name: string;
  description: string | null;
  status: string;
  businessCount: number;
  createdAt: string;
  createdBy: {
    email: string;
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = () => {
    setIsLoading(true);
    const url = statusFilter === 'all'
      ? '/api/admin/projects'
      : `/api/admin/projects?status=${statusFilter}`;

    fetch(url, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setProjects(data.projects || []);
        setIsLoading(false);
      })
      .catch((error) => {
        toast.error('Failed to load projects');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadProjects();
  }, [statusFilter]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all associated businesses.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/projects/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Project deleted successfully');
        loadProjects();
      } else {
        toast.error('Failed to delete project');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-2">Manage city/town business groupings</p>
        </div>
        <Link href="/admin/projects/new">
          <Button>Create Project</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Projects</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Filter by status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No projects found. Create your first project to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Businesses</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell className="text-gray-600 max-w-xs truncate">
                      {project.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{project.businessCount}</TableCell>
                    <TableCell className="text-gray-600">{project.createdBy.email}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Link href={`/admin/projects/${project.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                      <Link href={`/admin/projects/${project.id}/edit`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(project.id, project.name)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
