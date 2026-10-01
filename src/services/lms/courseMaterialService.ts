import { Platform, Linking, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

// Dynamically import expo-file-system/legacy to avoid any bundler or platform incompatibilities
let FileSystem: any = null;
try {
  FileSystem = require('expo-file-system/legacy');
} catch {
  try {
    FileSystem = require('expo-file-system');
  } catch {
    FileSystem = null;
  }
}

export interface CourseMaterialItem {
  id: string;
  title: string;
  url: string;
  type: 'pdf' | 'document' | 'link';
  size?: string;
  lessonIndex?: number;
  lessonTitle?: string;
  description?: string;
  isCourseLevel?: boolean;
}

/**
 * Resolves the course title from any naming convention that Admin or Firestore might use.
 */
export const getCourseTitle = (course?: any, fallback = 'Course'): string => {
  if (!course) return fallback;
  if (typeof course === 'string') return course;

  const candidate =
    course.title ||
    course.courseTitle ||
    course.courseName ||
    course.name ||
    course.course_title ||
    course.course_name ||
    course.courseHeader ||
    course.heading ||
    course.subject;

  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate.trim();
  }
  return fallback;
};

/**
 * Normalizes URL strings ensuring valid protocol
 */
export const normalizeUrl = (rawUrl?: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

/**
 * Helper to extract valid PDF / file URL from an object
 */
const extractFileUrl = (obj: any): string => {
  if (!obj) return '';
  if (typeof obj === 'string') return normalizeUrl(obj);
  const candidate =
    obj.pdfUrl ||
    obj.pdf ||
    obj.materialUrl ||
    obj.material ||
    obj.fileUrl ||
    obj.url ||
    obj.link ||
    obj.downloadUrl ||
    obj.attachment ||
    obj.documentUrl ||
    obj.docUrl ||
    obj.notesUrl ||
    obj.notes ||
    obj.studyMaterial ||
    obj.courseMaterial;
  return typeof candidate === 'string' ? normalizeUrl(candidate) : '';
};

/**
 * Resolves all materials/PDFs uploaded by Admin for a course.
 * Handles course-level PDFs, module-level PDFs, and individual lecture PDFs.
 */
export const resolveCourseMaterials = (course: any): CourseMaterialItem[] => {
  if (!course) return [];
  const items: CourseMaterialItem[] = [];
  const seenUrls = new Set<string>();

  const cTitle = getCourseTitle(course, 'Course');

  // 1. Check Course-Level PDF fields
  const courseLevelUrl = extractFileUrl({
    pdfUrl: course.pdfUrl,
    pdf: course.pdf,
    materialUrl: course.materialUrl,
    material: course.material,
    courseMaterial: course.courseMaterial,
    studyMaterial: course.studyMaterial,
    notesUrl: course.notesUrl,
    fileUrl: course.fileUrl,
    downloadUrl: course.downloadUrl,
    attachment: course.attachment,
  });

  if (courseLevelUrl && !seenUrls.has(courseLevelUrl)) {
    seenUrls.add(courseLevelUrl);
    items.push({
      id: `${course.id || 'course'}-main-pdf`,
      title: `${cTitle} - Complete Study Material & Notes`,
      url: courseLevelUrl,
      type: 'pdf',
      size: course.materialSize || course.fileSize || 'PDF Document',
      description: 'Official comprehensive course handbook & study notes uploaded by Admin.',
      isCourseLevel: true,
    });
  }

  // 2. Check course.materials array (can contain objects or strings)
  const mats = course.materials || course.attachments || course.files || course.documents;
  if (Array.isArray(mats)) {
    mats.forEach((m: any, idx: number) => {
      const url = extractFileUrl(m);
      if (url && !seenUrls.has(url)) {
        seenUrls.add(url);
        const itemTitle =
          (typeof m === 'object' && (m.title || m.name || m.fileName)) ||
          `Study Material ${idx + 1} (PDF)`;
        const lessonIdx = typeof m === 'object' && typeof m.lessonIndex === 'number' ? m.lessonIndex : undefined;
        items.push({
          id: `${course.id || 'course'}-mat-${idx}`,
          title: itemTitle,
          url,
          type: 'pdf',
          size: (typeof m === 'object' && m.size) || 'PDF File',
          lessonIndex: lessonIdx,
          description: typeof m === 'object' ? m.description : undefined,
          isCourseLevel: lessonIdx === undefined,
        });
      }
    });
  }

  // 3. Check course.pdfUrls array
  if (Array.isArray(course.pdfUrls)) {
    course.pdfUrls.forEach((u: any, idx: number) => {
      const url = extractFileUrl(u);
      if (url && !seenUrls.has(url)) {
        seenUrls.add(url);
        items.push({
          id: `${course.id || 'course'}-pdfUrl-${idx}`,
          title: `Lecture ${idx + 1} - Study Notes & PDF`,
          url,
          type: 'pdf',
          lessonIndex: idx,
          size: 'PDF File',
          isCourseLevel: false,
        });
      }
    });
  }

  // 4. Check modules -> lessons
  if (Array.isArray(course.modules)) {
    let globalLessonIdx = 0;
    course.modules.forEach((mod: any, mIdx: number) => {
      if (Array.isArray(mod.lessons)) {
        mod.lessons.forEach((les: any, lIdx: number) => {
          const url = extractFileUrl(les);
          const currentIdx = globalLessonIdx;
          globalLessonIdx++;
          if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            const lTitle = les.title || `Lesson ${currentIdx + 1}`;
            items.push({
              id: `${course.id || 'course'}-mod-${mIdx}-les-${lIdx}`,
              title: `${lTitle} - Lecture Notes (PDF)`,
              url,
              type: 'pdf',
              lessonIndex: currentIdx,
              lessonTitle: lTitle,
              size: les.materialSize || les.fileSize || 'PDF Notes',
              description: `Study document attached to Lecture ${currentIdx + 1}.`,
              isCourseLevel: false,
            });
          }
        });
      }
    });
  }

  // 5. Check direct course.lessons array
  if (Array.isArray(course.lessons)) {
    course.lessons.forEach((les: any, idx: number) => {
      const url = extractFileUrl(les);
      if (url && !seenUrls.has(url)) {
        seenUrls.add(url);
        const lTitle = les.title || `Lesson ${idx + 1}`;
        items.push({
          id: `${course.id || 'course'}-les-${idx}`,
          title: `${lTitle} - Lecture Notes (PDF)`,
          url,
          type: 'pdf',
          lessonIndex: idx,
          lessonTitle: lTitle,
          size: les.materialSize || les.fileSize || 'PDF Notes',
          description: `Study document attached to Lecture ${idx + 1}.`,
          isCourseLevel: false,
        });
      }
    });
  }

  // 6. Check course.syllabus if objects with pdfUrl
  if (Array.isArray(course.syllabus)) {
    course.syllabus.forEach((s: any, idx: number) => {
      if (typeof s === 'object' && s !== null) {
        const url = extractFileUrl(s);
        if (url && !seenUrls.has(url)) {
          seenUrls.add(url);
          const sTitle = s.title || `Lecture ${idx + 1}`;
          items.push({
            id: `${course.id || 'course'}-syl-${idx}`,
            title: `${sTitle} - Lecture Notes (PDF)`,
            url,
            type: 'pdf',
            lessonIndex: idx,
            lessonTitle: sTitle,
            size: s.size || 'PDF Notes',
            isCourseLevel: false,
          });
        }
      }
    });
  }

  return items;
};

/**
 * Resolves the specific lecture's material / PDF for the currently active lessonIndex.
 * If the lesson has a specific PDF, returns it.
 * If not, and fallbackToCourseLevel is true, returns the course-level PDF.
 */
export const resolveLectureMaterial = (
  course: any,
  lessonIndex: number,
  fallbackToCourseLevel: boolean = true
): CourseMaterialItem | null => {
  if (!course) return null;
  const allMaterials = resolveCourseMaterials(course);

  // 1. Look for material specifically mapped to this lessonIndex
  const directMatch = allMaterials.find((m) => m.lessonIndex === lessonIndex);
  if (directMatch) return directMatch;

  // 2. If no direct match, check if there's a course-level material
  if (fallbackToCourseLevel) {
    const courseLevel = allMaterials.find((m) => m.isCourseLevel);
    if (courseLevel) return courseLevel;
    // If only 1 material exists for this course, provide it for all lessons as study notes
    if (allMaterials.length === 1) return allMaterials[0];
  }

  return null;
};

/**
 * Clean filename generator
 */
const sanitizeFilename = (name: string): string => {
  const clean = name.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_');
  return clean.endsWith('.pdf') ? clean : `${clean}.pdf`;
};

/**
 * Downloads a PDF file to the device storage and invokes the native Share/Save dialog.
 * Provides fallback to browser/web viewer if downloadAsync is unavailable.
 */
export const downloadAndOpenPdf = async (
  item: { title: string; url: string },
  onProgress?: (progressPercent: number) => void
): Promise<{ success: boolean; error?: string }> => {
  const url = normalizeUrl(item.url);
  if (!url) {
    Alert.alert('No Link', 'The PDF link is missing or empty.');
    return { success: false, error: 'Empty URL' };
  }

  // Web platform fallback
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined') {
        const link = window.document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = sanitizeFilename(item.title);
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        return { success: true };
      }
    } catch {
      await Linking.openURL(url);
      return { success: true };
    }
  }

  // Mobile platform (Android / iOS)
  try {
    const fileName = sanitizeFilename(item.title || 'Course_Material');
    const docDir = FileSystem?.documentDirectory || FileSystem?.cacheDirectory;

    if (FileSystem && docDir && FileSystem.downloadAsync) {
      const localUri = `${docDir}${Date.now()}_${fileName}`;

      let downloadRes: any = null;
      if (onProgress && FileSystem.createDownloadResumable) {
        const resumable = FileSystem.createDownloadResumable(
          url,
          localUri,
          {},
          (progress: any) => {
            if (progress.totalBytesExpectedToWrite > 0) {
              const pct = Math.round(
                (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100
              );
              onProgress(Math.min(100, Math.max(0, pct)));
            }
          }
        );
        downloadRes = await resumable.downloadAsync();
      } else {
        downloadRes = await FileSystem.downloadAsync(url, localUri);
      }

      if (downloadRes && downloadRes.uri) {
        const shareAvailable = await Sharing.isAvailableAsync().catch(() => false);
        if (shareAvailable) {
          await Sharing.shareAsync(downloadRes.uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Download / Save ${item.title}`,
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert(
            'PDF Downloaded! 📥',
            `File saved successfully at:\n${downloadRes.uri}`
          );
        }
        return { success: true };
      }
    }

    // Fallback: In-app browser
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      toolbarColor: '#4F46E5',
    });
    return { success: true };
  } catch (error: any) {
    console.warn('[courseMaterialService] Download error, attempting fallback URL open:', error);
    try {
      await Linking.openURL(url);
      return { success: true };
    } catch (openErr: any) {
      Alert.alert(
        'Download Error',
        'Could not download or open this PDF. Please verify your internet connection or ask Admin to check the uploaded file link.'
      );
      return { success: false, error: error?.message || 'Download failed' };
    }
  }
};

/**
 * Opens a PDF directly in an in-app viewer or browser preview.
 */
export const previewPdf = async (url: string, title?: string): Promise<boolean> => {
  const normUrl = normalizeUrl(url);
  if (!normUrl) {
    Alert.alert('File Unavailable', 'Admin has not attached a valid file link for this item.');
    return false;
  }

  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(normUrl, '_blank');
        return true;
      }
    }

    await WebBrowser.openBrowserAsync(normUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      toolbarColor: '#4F46E5',
      createTask: false,
    });
    return true;
  } catch (err) {
    try {
      await Linking.openURL(normUrl);
      return true;
    } catch {
      Alert.alert('Cannot Open PDF', 'The PDF link could not be opened on your device.');
      return false;
    }
  }
};
