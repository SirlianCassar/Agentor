import type { ReactNode } from 'react'
import type { DraggableAttributes } from '@dnd-kit/core'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type SortableListeners = ReturnType<typeof useSortable>['listeners']

interface SortableRenderProps {
  attributes: DraggableAttributes
  listeners: SortableListeners
}

interface SortableItemProps {
  id: string
  children: (props: SortableRenderProps) => ReactNode
}

function SortableItem({ id, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={`sortable-item${isDragging ? ' is-dragging' : ''}`}>
      {children({ attributes, listeners })}
    </div>
  )
}

interface SortableListProps<T> {
  items: T[]
  getId: (item: T) => string
  onReorder: (items: T[]) => void
  renderItem: (item: T, handleProps: SortableRenderProps) => ReactNode
}

export function SortableList<T>({ items, getId, onReorder, renderItem }: SortableListProps<T>) {
  const ids = items.map((item) => getId(item))

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={(event) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIndex = ids.indexOf(active.id as string)
        const newIndex = ids.indexOf(over.id as string)
        if (oldIndex === -1 || newIndex === -1) return
        onReorder(arrayMove(items, oldIndex, newIndex))
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="sortable-list">
          {items.map((item) => {
            const id = getId(item)
            return (
              <SortableItem key={id} id={id}>
                {(handleProps) => renderItem(item, handleProps)}
              </SortableItem>
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
