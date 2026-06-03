import { useState } from 'react'
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { suggestUnit, allUnits } from '../db/units'
import './IngredientsInput.css'

function SortableIngredient({ id, ing, index, onRemove }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <li ref={setNodeRef} style={style}>
            <span className="drag-handle" {...attributes} {...listeners}>⠿</span>
            <span className="ingredient-name">{ing.name}</span>
            <span className="ingredient-amount">{ing.amount ? `${ing.amount} ${ing.unit}` : ''}</span>
            <button onClick={() => onRemove(index)}>✕</button>
        </li>
    )
}

function IngredientsInput({ ingredients, onChange }) {
    const [newAmount, setNewAmount] = useState('')
    const [newUnit, setNewUnit] = useState('g')
    const [newName, setNewName] = useState('')

    const sensors = useSensors(
        useSensor(PointerSensor)
    )

    const handleNameChange = (value) => {
        setNewName(value)
        if (value.trim().length > 2) {
            setNewUnit(suggestUnit(value))
        }
    }

    const handleAdd = () => {
        if (!newName.trim()) return
        const ingredient = {
            id: Date.now().toString(),
            amount: newAmount,
            unit: newUnit,
            name: newName.trim()
        }
        onChange([...ingredients, ingredient])
        setNewAmount('')
        setNewUnit('g')
        setNewName('')
    }

    const handleRemove = (index) => {
        onChange(ingredients.filter((_, i) => i !== index))
    }

    const handleDragEnd = (event) => {
        const { active, over } = event
        if (active.id !== over?.id) {
            const oldIndex = ingredients.findIndex(i => i.id === active.id)
            const newIndex = ingredients.findIndex(i => i.id === over.id)
            onChange(arrayMove(ingredients, oldIndex, newIndex))
        }
    }

    return (
        <div className="ingredients-input">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={ingredients.map(i => i.id || i.name)}
                    strategy={verticalListSortingStrategy}
                >
                    {ingredients.length > 0 && (
                        <ul className="ingredients-list">
                            {ingredients.map((ing, index) => (
                                <SortableIngredient
                                    key={ing.id || ing.name}
                                    id={ing.id || ing.name}
                                    ing={ing}
                                    index={index}
                                    onRemove={handleRemove}
                                />
                            ))}
                        </ul>
                    )}
                </SortableContext>
            </DndContext>

            <div className="ingredient-row">
                <input
                    type="text"
                    placeholder="Zutat"
                    value={newName}
                    onChange={e => handleNameChange(e.target.value)}
                    className="input-name"
                />
                <input
                    type="number"
                    placeholder="Menge"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    className="input-amount"
                />
                <select
                    value={newUnit}
                    onChange={e => setNewUnit(e.target.value)}
                    className="input-unit"
                >
                    {allUnits.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                    ))}
                </select>
                <button onClick={handleAdd} className="add-ingredient-btn">+</button>
            </div>
        </div>
    )
}

export default IngredientsInput