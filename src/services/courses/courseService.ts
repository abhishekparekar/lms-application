/**
 * Legacy re-export compatibility shim.
 * All course types and service methods are now in lmsService.ts.
 * This file re-exports them so existing imports continue to work.
 */
export type {
  Course,
  CourseModule,
  Lesson,
  CoursePriceInfo,
} from '../lms/lmsService';

export { courseService, calculateCoursePrice } from '../lms/lmsService';

