import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding demo data...')

  // Create a demo session
  const session = await prisma.session.create({
    data: {
      code: 'DEMO01',
      question: 'Should AI systems be required to disclose when they are interacting with humans?',
      groupSize: 4,
      phase: 'COMPLETE',
      instructorSecret: process.env.INSTRUCTOR_SECRET || 'demo-secret',
    },
  })

  // Create a group
  const group = await prisma.group.create({
    data: {
      sessionId: session.id,
      name: 'Group A',
      number: 1,
    },
  })

  // Create demo participants
  const names = ['Alex', 'Jordan', 'Sam', 'Taylor']
  const participants = []
  for (const name of names) {
    const p = await prisma.participant.create({
      data: {
        sessionId: session.id,
        groupId: group.id,
        displayName: name,
      },
    })
    participants.push(p)
  }

  // Create demo opinions
  const opinions = [
    'I think AI should always disclose its identity. People have a right to know if they are talking to a machine. Deception undermines trust in online communication.',
    'Disclosure is important in high-stakes situations like healthcare or legal advice, but requiring it everywhere seems impractical. Chatbots on retail sites don\'t need a warning label.',
    'Full disclosure is essential for democracy. If AI can impersonate humans in political discussions, it could manipulate public opinion without anyone knowing.',
    'I worry that mandatory disclosure would stifle innovation. Sometimes AI assistants work better when users interact naturally. The focus should be on preventing harm, not blanket rules.',
  ]

  for (let i = 0; i < participants.length; i++) {
    await prisma.opinion.create({
      data: {
        participantId: participants[i].id,
        groupId: group.id,
        sessionId: session.id,
        text: opinions[i],
      },
    })
  }

  // Create demo initial candidates
  const initialCandidates = [
    {
      text: 'The group agrees that AI transparency matters, particularly in contexts where trust and informed decision-making are essential. Many members support mandatory disclosure in high-stakes domains like healthcare, legal services, and political discourse. However, some question whether universal disclosure requirements are practical or beneficial in all contexts, such as routine customer service. The group believes the key principle is preventing deception that could cause harm, while acknowledging disagreement about how broadly disclosure rules should apply.',
      rationale: 'Reconciles the shared value of transparency with the disagreement about scope of application.',
      bordaScore: 12,
      isWinner: true,
    },
    {
      text: 'Our group holds that people have a fundamental right to know when they are interacting with an AI system. This right is especially critical in democratic contexts where AI-generated content could influence political opinions without accountability. While we recognize that some members see practical challenges in universal disclosure, the group prioritizes preventing AI deception over convenience in commercial applications.',
      rationale: 'Emphasizes the rights-based and democratic arguments that appeared in multiple opinions.',
      bordaScore: 10,
      isWinner: false,
    },
    {
      text: 'The group is divided on how broadly AI disclosure should be required. All members agree that transparency is important in principle, but there is genuine disagreement about implementation. One perspective holds that blanket disclosure rules are essential to maintain trust. Another argues that context-dependent regulation focused on preventing specific harms would be more effective than universal mandates. The group has not reached consensus on where to draw the line.',
      rationale: 'Focuses on honestly representing the disagreement rather than claiming false consensus.',
      bordaScore: 11,
      isWinner: false,
    },
    {
      text: 'AI disclosure should be mandatory in any situation where an AI system could influence a person\'s beliefs, decisions, or rights. This includes healthcare consultations, legal advice, political discussions, and financial services. For low-stakes interactions like retail chatbots, disclosure should be available but not necessarily prominent. The group supports a risk-based approach that matches disclosure requirements to the potential for harm.',
      rationale: 'Synthesizes the risk-based framework implied by several members into a concrete policy position.',
      bordaScore: 7,
      isWinner: false,
    },
  ]

  for (let i = 0; i < initialCandidates.length; i++) {
    await prisma.candidateStatement.create({
      data: {
        groupId: group.id,
        sessionId: session.id,
        round: 'INITIAL',
        candidateIndex: i,
        text: initialCandidates[i].text,
        rationale: initialCandidates[i].rationale,
        bordaScore: initialCandidates[i].bordaScore,
        isWinner: initialCandidates[i].isWinner,
      },
    })
  }

  // Create demo critiques
  const critiques = [
    { good: 'It captures the main tension well', missing: 'Doesn\'t mention the democratic argument strongly enough', unfair: '', changes: 'Add more about political manipulation risks' },
    { good: 'Good balance of views', missing: 'Innovation concerns are underplayed', unfair: 'Makes the "practical concerns" view sound less important', changes: 'Give equal weight to the innovation perspective' },
    { good: 'Acknowledges disagreement honestly', missing: 'Could mention specific examples', unfair: '', changes: 'Add concrete scenarios' },
    { good: 'Well-structured and clear', missing: 'Doesn\'t address enforcement mechanisms', unfair: '', changes: 'Mention how disclosure would actually work in practice' },
  ]

  for (let i = 0; i < participants.length; i++) {
    await prisma.critique.create({
      data: {
        participantId: participants[i].id,
        groupId: group.id,
        sessionId: session.id,
        ...critiques[i],
      },
    })
  }

  // Create demo revised candidates
  const revisedCandidates = [
    {
      text: 'The group agrees that AI transparency is a fundamental issue for trust and democracy. In high-stakes domains — healthcare, legal services, political discourse, and financial decisions — mandatory disclosure should be required because AI influence on beliefs and rights demands accountability. For routine interactions like customer service chatbots, the group is divided: some see disclosure as always necessary for trust, while others argue it should be available but not mandatory. The group notes that practical enforcement mechanisms remain an open question, and that disclosure rules must avoid stifling beneficial AI innovation while preventing the democratic risks of undetected AI influence in public debate.',
      rationale: 'Addresses critiques by strengthening the democratic argument, acknowledging enforcement gaps, and giving more weight to innovation concerns.',
      bordaScore: 14,
      isWinner: true,
    },
    {
      text: 'AI systems interacting with humans should be required to disclose their nature, with the strictness of disclosure scaling to the stakes involved. The group specifically identifies political manipulation — where AI could impersonate human participants in democratic discourse — as the highest-priority concern requiring immediate regulation. In healthcare and legal contexts, disclosure protects informed consent. For commercial contexts, the group disagrees on whether mandatory labels or optional disclosure better serves users. All members agree that any framework must include practical enforcement mechanisms and should balance transparency with continued innovation in beneficial AI applications.',
      rationale: 'Incorporates the democratic urgency requested in critiques while addressing the enforcement and innovation gaps identified.',
      bordaScore: 11,
      isWinner: false,
    },
    {
      text: 'The group shares a core belief that people deserve to know when AI is involved in consequential interactions, but genuinely disagrees about scope and implementation. Concrete scenarios illustrate the tension: an AI therapist should clearly identify itself, but should every autocomplete suggestion carry a disclaimer? The group agrees on three principles: (1) disclosure must be mandatory where AI could influence beliefs, health, or legal outcomes; (2) enforcement mechanisms need development alongside disclosure rules; (3) regulations should be designed to prevent harm without unnecessarily constraining beneficial AI tools. The group has not reached consensus on exactly where "consequential" begins.',
      rationale: 'Responds to the call for concrete examples and enforcement discussion, while honestly noting where consensus breaks down.',
      bordaScore: 9,
      isWinner: false,
    },
    {
      text: 'Our group recognizes AI disclosure as both a transparency issue and a democratic imperative. The risk of AI-generated political manipulation without accountability represents a distinct threat that requires stronger protections than commercial AI interactions. While all members value innovation, the group consensus is that innovation arguments should not override the fundamental right to know when one is interacting with a machine in contexts that matter for democratic participation, personal health, or legal rights. For lower-stakes contexts, the group recommends accessible opt-in disclosure rather than mandatory warnings, with the understanding that what counts as "lower-stakes" requires ongoing democratic deliberation.',
      rationale: 'Prioritizes the democratic argument as the strongest area of agreement while creating space for the innovation perspective in lower-stakes contexts.',
      bordaScore: 6,
      isWinner: false,
    },
  ]

  for (let i = 0; i < revisedCandidates.length; i++) {
    await prisma.candidateStatement.create({
      data: {
        groupId: group.id,
        sessionId: session.id,
        round: 'REVISED',
        candidateIndex: i,
        text: revisedCandidates[i].text,
        rationale: revisedCandidates[i].rationale,
        bordaScore: revisedCandidates[i].bordaScore,
        isWinner: revisedCandidates[i].isWinner,
      },
    })
  }

  // Create demo final preferences
  const prefs = ['REVISED', 'REVISED', 'REVISED', 'INITIAL'] as const
  for (let i = 0; i < participants.length; i++) {
    await prisma.finalPreference.create({
      data: {
        participantId: participants[i].id,
        groupId: group.id,
        sessionId: session.id,
        preference: prefs[i],
        feltRepresented: [4, 5, 3, 4][i],
        processFair: [4, 4, 5, 3][i],
        revisedImproved: [5, 4, 4, 2][i],
      },
    })
  }

  console.log(`Demo session created with code: DEMO01`)
  console.log(`  - 4 participants in 1 group`)
  console.log(`  - Full deliberation cycle with initial + revised candidates`)
  console.log(`  - View at /instructor/DEMO01 (use secret: ${process.env.INSTRUCTOR_SECRET || 'demo-secret'})`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
