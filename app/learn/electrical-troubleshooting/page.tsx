import LearningPathView from '@/components/learning/LearningPathView'
import { getLearningPath } from '@/lib/learning/paths'
export default function ElectricalPath() {
  return <LearningPathView path={getLearningPath('electrical-troubleshooting')!}/>
}
