import LearningPathView from '@/components/learning/LearningPathView'
import { getLearningPath } from '@/lib/learning/paths'
export default function DefrostPath() {
  return <LearningPathView path={getLearningPath('defrost')!}/>
}
