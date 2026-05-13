import { z } from "zod";

export const Cargo = z.enum(["APF", "DPF", "EPF", "PCF", "PPF"]);
export const Sexo = z.enum(["M", "F"]);
export const Situacao = z.enum(["REGULAR", "SUB JUDICE", "ESPECIAL"]);
export const Criterio = z.enum(["completar", "round-robin"]);

export const LockManualSchema = z.object({
  turma: z.boolean().optional(),
  alojamento: z.boolean().optional(),
  nomeGuerra: z.boolean().optional()
});

export const PessoaSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1),
  cpf: z.string().min(1),
  cargo: Cargo,
  sexo: Sexo,
  situacao: Situacao,
  email: z.string().min(1),
  dataNascimento: z.string().optional(),
  fatoRH: z.string().optional(),
  tipoSanguineo: z.string().optional(),
  dddTelefoneFixo: z.string().optional(),
  numTelefoneFixo: z.string().optional(),
  dddCel: z.string().optional(),
  celular: z.string().optional(),
  curso: z.string().optional(),
  turmaId: z.string().optional(),
  alojamentoId: z.string().optional(),
  nomeGuerra: z.string().optional(),
  criadoEm: z.string(),
  lockManual: LockManualSchema
});

export const TurmaSchema = z.object({
  id: z.string().min(1),
  cargo: Cargo,
  numero: z.number().int().positive(),
  label: z.string().min(1)
});

export const AlojamentoSchema = z.object({
  id: z.string().min(1),
  bloco: z.string().min(1),
  cargoSexo: z.string().min(1),
  max: z.number().int().positive()
});

export const ConfigSchema = z.object({
  turmasPorCargo: z.object({
    APF: z.number().int().nonnegative(),
    DPF: z.number().int().nonnegative(),
    EPF: z.number().int().nonnegative(),
    PCF: z.number().int().nonnegative(),
    PPF: z.number().int().nonnegative()
  }),
  criterioDistribuicao: Criterio,
  folgaAlojamento: z.number().min(0).max(0.9),
  normalizacoesFoneticas: z.array(z.object({ de: z.string(), para: z.string() })),
  stopWordsNomeGuerra: z.array(z.string())
});

export const MetaSchema = z.object({
  edicao: z.string().min(1),
  criadoEm: z.string(),
  atualizadoEm: z.string()
});

export const HistoricoEntrySchema = z.object({
  ts: z.string(),
  acao: z.string(),
  detalhes: z.unknown()
});

export const DBSchema = z.object({
  version: z.literal(1),
  meta: MetaSchema,
  config: ConfigSchema,
  alojamentos: z.array(AlojamentoSchema),
  pessoas: z.array(PessoaSchema),
  turmas: z.array(TurmaSchema),
  historico: z.array(HistoricoEntrySchema)
});

export type Pessoa = z.infer<typeof PessoaSchema>;
export type Turma = z.infer<typeof TurmaSchema>;
export type Alojamento = z.infer<typeof AlojamentoSchema>;
export type Config = z.infer<typeof ConfigSchema>;
export type DB = z.infer<typeof DBSchema>;
export type Meta = z.infer<typeof MetaSchema>;

export const DEFAULT_CONFIG: Config = {
  turmasPorCargo: { APF: 1, DPF: 1, EPF: 1, PCF: 1, PPF: 1 },
  criterioDistribuicao: "completar",
  folgaAlojamento: 0.15,
  normalizacoesFoneticas: [
    { de: "TH", para: "T" },
    { de: "LL", para: "L" },
    { de: "CC", para: "C" },
    { de: "NN", para: "N" },
    { de: "PH", para: "F" },
    { de: "LUIZ", para: "LUIS" },
    { de: "SOUZA", para: "SOUSA" },
    { de: "RACHEL", para: "RAQUEL" },
    { de: "VICTOR", para: "VITOR" }
  ],
  stopWordsNomeGuerra: ["DE", "DI", "DO", "DOS", "E", "D", "SAO"]
};
