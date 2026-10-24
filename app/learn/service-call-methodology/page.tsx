import LearningPathView from '@/components/learning/LearningPathView'
import { getLearningPath } from '@/lib/learning/paths'
export default function ServiceCallPath() {
  return <LearningPathView path={getLearningPath('service-call-methodology')!}/>
}
