/**
 * Legacy re-export compatibility shim.
 * All course types and service methods are now in lmsService.ts.
 * This file re-exports them so existing imports continue to work.
 */
export type {
  Course,
  CourseModule,
  Lesson,
} from '../lms/lmsService';

export { courseService } from '../lms/lmsService';
