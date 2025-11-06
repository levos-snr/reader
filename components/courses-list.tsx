"use client";

import type React from "react";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CoursesListProps {
  userId: string;
}

export function CoursesList({ userId }: CoursesListProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "" });

  const courses = useQuery(api.courses.getUserCourses, { userId });
  const createCourseMutation = useMutation(api.courses.createCourse);
  const deleteCourseMutation = useMutation(api.courses.deleteCourse);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Course title is required");
      return;
    }

    try {
      await createCourseMutation({
        title: formData.title,
        description: formData.description,
        userId,
      });
      toast.success("Course created successfully!");
      setFormData({ title: "", description: "" });
      setIsCreating(false);
    } catch (error) {
      toast.error("Failed to create course");
    }
  };

  const handleDelete = async (courseId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this course? All materials and quizzes will be deleted."
      )
    ) {
      try {
        await deleteCourseMutation({ courseId });
        toast.success("Course deleted successfully!");
      } catch (error) {
        toast.error("Failed to delete course");
      }
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">My Courses</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Total courses: {courses?.length || 0}
          </p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} size="sm" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          New Course
        </Button>
      </div>

      {/* Create Course Form */}
      {isCreating && (
        <Card className="p-4 sm:p-6 border-border bg-card">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm sm:text-base">Course Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Enter course title"
                className="mt-2 bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-sm sm:text-base">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter course description"
                className="mt-2 bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" className="w-full sm:w-auto">Create Course</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setFormData({ title: "", description: "" });
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Courses Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {courses?.map((course) => (
          <Card
            key={course._id}
            className="p-3 sm:p-4 hover:border-primary/50 transition-colors flex flex-col border-border bg-card"
          >
            <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base line-clamp-2 text-foreground">
                  {course.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(course.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {course.description && (
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2 sm:mb-3 flex-1">
                {course.description}
              </p>
            )}

            <div className="flex gap-2 pt-2 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 bg-transparent border-border hover:bg-card text-xs sm:text-sm"
              >
                View
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(course._id)}
                className="text-xs sm:text-sm"
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {courses?.length === 0 && !isCreating && (
        <Card className="p-8 sm:p-12 text-center border-border bg-card">
          <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground">
            No Courses Yet
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-4">
            Create your first course to get started with your revision materials
          </p>
          <Button onClick={() => setIsCreating(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create First Course
          </Button>
        </Card>
      )}
    </div>
  );
}
