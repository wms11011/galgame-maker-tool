import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface GlossaryTerm { term: string; category: string; definition: string }

export const useGlossaryStore = defineStore('glossary', () => {
  const terms = ref<GlossaryTerm[]>([])

  function loadTerms(data: GlossaryTerm[]): void { terms.value = data.map(t => ({ ...t })) }
  function addTerm(term: GlossaryTerm): void { if (!terms.value.some(t => t.term === term.term)) terms.value.push({ ...term }) }
  function updateTerm(oldTerm: string, term: GlossaryTerm): void {
    const i = terms.value.findIndex(t => t.term === oldTerm)
    if (i >= 0) terms.value[i] = { ...term }
    else terms.value.push({ ...term })
  }
  function removeTerm(term: string): void { terms.value = terms.value.filter(t => t.term !== term) }

  return { terms, loadTerms, addTerm, updateTerm, removeTerm }
})
