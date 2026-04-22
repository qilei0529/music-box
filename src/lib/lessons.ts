export interface Lesson {
  slug: string
  title: string
  description: string
}

export const lessons: Lesson[] = [
  {
    slug: '01-solfege',
    title: '认识音符 Do Re Mi',
    description: '学习钢琴的七个基本音符和唱名',
  },
  {
    slug: '02-read-sheet-and-song',
    title: '认识钢琴谱 + 简单曲子',
    description: '学习五线谱入门，并练习一首超简单旋律',
  },
]
