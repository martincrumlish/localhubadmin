'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import MapsBusinessPicker from '../components/MapsBusinessPicker';
interface Project {
  id: number;
  name: string;
  description: string | null;
  status: string;
  createdBy: {
    email: string;
  };
  businesses: Business[];
}

interface Business {
  id: number;
  placeId: string;
  businessName: string;
  createdAt: string;
  addedBy: {
    email: string;
  };
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [focusBusinessOnMap, setFocusBusinessOnMap] = useState<((placeId: string) => void) | null>(null);

  const loadProject = () => {
    setIsLoading(true);
    fetch(`/api/admin/projects/${projectId}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load project');
        return res.json();
      })
      .then((data) => {
        setProject(data.project);
        setIsLoading(false);
      })
      .catch((error) => {
        toast.error('Failed to load project');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const handleRemoveBusiness = async (businessId: number, businessName: string) => {
    if (!confirm(`Are you sure you want to remove "${businessName}" from this project?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/businesses/${businessId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Business removed successfully');
        loadProject();
      } else {
        toast.error('Failed to remove business');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleMapReady = useCallback((focusFn: (placeId: string) => void) => {
    setFocusBusinessOnMap(() => focusFn);
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-gray-600 mt-2">{project.description || 'No description'}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/projects/${projectId}/edit`}>
            <Button variant="outline">Edit Project</Button>
          </Link>
          <Link href="/admin/projects">
            <Button variant="outline">Back to Projects</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="font-medium">Status:</span>{' '}
            <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
              {project.status}
            </Badge>
          </div>
          <div>
            <span className="font-medium">Created By:</span> {project.createdBy.email}
          </div>
          <div>
            <span className="font-medium">Total Businesses:</span> {project.businesses.length}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Business</CardTitle>
        </CardHeader>
        <CardContent>
          <MapsBusinessPicker
            projectId={projectId}
            onBusinessAdded={loadProject}
            existingBusinesses={project.businesses.map(b => ({
              id: b.id,
              placeId: b.placeId,
              businessName: b.businessName
            }))}
            onMapReady={handleMapReady}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Businesses in this Project</CardTitle>
        </CardHeader>
        <CardContent>
          {project.businesses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No businesses added yet. Use the map above to add businesses to this project.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Place ID</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.businesses.map((business) => (
                  <TableRow key={business.id}>
                    <TableCell className="font-medium">{business.businessName}</TableCell>
                    <TableCell className="text-gray-600 font-mono text-sm">{business.placeId}</TableCell>
                    <TableCell className="text-gray-600">{business.addedBy.email}</TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(business.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => focusBusinessOnMap?.(business.placeId)}
                          disabled={!focusBusinessOnMap}
                        >
                          Show on Map
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveBusiness(business.id, business.businessName)}
                        >
                          Remove
                        </Button>
                      </div>
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
