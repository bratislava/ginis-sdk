import { Ginis, UdeSeznamDokumentuSeznamDokumentuItem } from '../../../index'
import { envGetOrThrow } from '../../../utils/test-utils'

// Only used for research purposes
describe.skip('UDE-Histogram-dokumentu', () => {
  let ginis: Ginis
  beforeAll(() => {
    console.log(
      'Loading GINIS credentials from .env - make sure you have correct local configuration.'
    )
    ginis = new Ginis({
      urls: {
        ude: envGetOrThrow('GINIS_UDE_HOST'),
      },
      username: envGetOrThrow('GINIS_USERNAME'),
      password: envGetOrThrow('GINIS_PASSWORD'),
      debug: false,
    })
  })

  test('Histogram of documents grouped by Id-dokumentu', async () => {
    // Load all documents (both active and non-active)

    const allDocuments = (await ginis.ude.seznamDokumentu({}))['Seznam-dokumentu']

    for (const doc of allDocuments) {
      if (!doc['Sejmuto-dne']) {
        console.log(`Document ${doc['Id-zaznamu']} has no Sejmuto-dne date`)
      }
    }

    // Group by Id-dokumentu (only documents that have this field)
    // Store both the count and the actual documents
    const groupedByDocumentId = new Map<string, UdeSeznamDokumentuSeznamDokumentuItem[]>()
    for (const doc of allDocuments) {
      if (doc['Id-dokumentu']) {
        const id = doc['Id-dokumentu']
        const existing: UdeSeznamDokumentuSeznamDokumentuItem[] = groupedByDocumentId.get(id) || []
        existing.push(doc)
        groupedByDocumentId.set(id, existing)
      }
    }

    // Group documents by their group size (1, 2, 3, etc.)
    const groupsBySize = new Map<
      number,
      { idDokumentu: string; docs: UdeSeznamDokumentuSeznamDokumentuItem[] }[]
    >()
    for (const [idDokumentu, docs] of groupedByDocumentId.entries()) {
      const size = docs.length
      const existing = groupsBySize.get(size) || []
      existing.push({ idDokumentu, docs })
      groupsBySize.set(size, existing)
    }

    // Find the maximum group size
    const maxGroupSize = Math.max(...Array.from(groupsBySize.keys()), 0)

    // Print histogram with document details (only up to the largest group size that exists)
    console.log('\nHistogram of documents grouped by Id-dokumentu:')
    for (let i = 1; i <= maxGroupSize; i++) {
      const groups = groupsBySize.get(i) || []
      if (groups.length > 0) {
        const groupCount = groups.length
        // For groups with at least 2 documents, show details in format: G2: 21 - docId1 (id1, id2, ...), docId2 (id3, id4, ...)
        // Show only 2 document IDs but all Id-zaznamu for each
        if (i >= 2) {
          const docList = groups
            .slice(0, 2)
            .map(({ idDokumentu, docs }) => {
              const idZaznamuList = docs.map((doc) => doc['Id-zaznamu']).join(', ')
              return `${idDokumentu} (${idZaznamuList})`
            })
            .join(', ')
          console.log(`G${i}: ${groupCount} - ${docList}`)
        } else {
          console.log(`G${i}: ${groupCount}`)
        }
      }
    }

    // Test always passes
    expect(true).toBe(true)
  }, 40_000)
})
