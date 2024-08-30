import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import path from 'path';

dotenv.config();

const dbPath = path.join(__dirname, 'data', 'database.db');
const app = express();
app.use(express.json());
const PORT = 3000;

const STATUS_OK = 200;
const STATUS_BAD_REQUEST = 400;
const STATUS_NOT_FOUND = 404;
const STATUS_CONFLICT = 409;
const STATUS_INTERNAL_SERVER_ERROR = 500;

const ERROR_CODES = {
  INVALID_DATA: "INVALID_DATA",
  NOT_FOUND: "NOT_FOUND",
  ALREADY_CONFIRMED: "ALREADY_CONFIRMED",
};

const ERROR_MESSAGES = {
  INVALID_DATA: "Os dados fornecidos no corpo da requisição são inválidos",
  NOT_FOUND: "Código de leitura não encontrado",
  ALREADY_CONFIRMED: "Código de leitura já foi confirmado",
};

interface ConfirmRequestBody {
  measure_uuid: string;
  confirmed_value: number;
}

interface ReadingResult {
  confirmed: boolean;
}

interface Measure {
  measure_uuid: string;
  measure_datetime: string;
  measure_type: string;
  has_confirmed: boolean;
  image_url: string;
}

interface MeasuresResponse {
  customer_code: string;
  measures: Measure[];
}

function openDb() {
  return new sqlite3.Database(dbPath);
}

async function getReading(measure_uuid: string): Promise<ReadingResult | null> {
  const db = openDb();
  return new Promise<ReadingResult | null>((resolve, reject) => {
    db.get<ReadingResult>(
      `SELECT confirmed FROM readings WHERE uuid = ?`,
      [measure_uuid],
      (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      }
    );
  });
}

async function updateReading(measure_uuid: string, confirmed_value: number): Promise<void> {
  const db = openDb();
  return new Promise<void>((resolve, reject) => {
    db.run(
      `UPDATE readings SET confirmed = ?, confirmed_value = ? WHERE uuid = ?`,
      [true, confirmed_value, measure_uuid],
      (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      }
    );
  });
}

async function getMeasures(customer_code: string, measure_type?: string): Promise<Measure[]> {
  const db = openDb();
  let query = `
    SELECT uuid AS measure_uuid,
           measure_datetime,
           measure_type,
           confirmed AS has_confirmed,
           '/images/' || uuid || '.jpeg' AS image_url
    FROM readings
    WHERE customer_code = ?
  `;

  const params: any[] = [customer_code];

  if (measure_type) {
    query += ' AND LOWER(measure_type) = LOWER(?)';
    params.push(measure_type);
  }

  return new Promise<Measure[]>((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows as Measure[]);
    });
  });
}

app.patch('/confirm', async (req: Request<{}, {}, ConfirmRequestBody>, res: Response) => {
  const { measure_uuid, confirmed_value } = req.body;

  if (typeof measure_uuid !== 'string' || typeof confirmed_value !== 'number') {
    return res.status(STATUS_BAD_REQUEST).json({
      error_code: ERROR_CODES.INVALID_DATA,
      error_description: ERROR_MESSAGES.INVALID_DATA,
    });
  }

  try {
    const reading = await getReading(measure_uuid);

    if (!reading) {
      return res.status(STATUS_NOT_FOUND).json({
        error_code: ERROR_CODES.NOT_FOUND,
        error_description: ERROR_MESSAGES.NOT_FOUND,
      });
    }

    if (reading.confirmed) {
      return res.status(STATUS_CONFLICT).json({
        error_code: ERROR_CODES.ALREADY_CONFIRMED,
        error_description: ERROR_MESSAGES.ALREADY_CONFIRMED,
      });
    }

    await updateReading(measure_uuid, confirmed_value);

    res.status(STATUS_OK).json({ message: 'OK' });
  } catch (error) {
    console.error("Erro ao processar a confirmação:", error);
    res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      error_code: ERROR_CODES.INVALID_DATA,
      error_description: "Erro interno do servidor",
    });
  }
});

app.get('/:customer_code/list', async (req: Request<{ customer_code: string }, {}, {}, { measure_type?: string }>, res: Response) => {
  const { customer_code } = req.params;
  const { measure_type } = req.query;

  if (typeof customer_code !== 'string') {
    return res.status(STATUS_BAD_REQUEST).json({
      error_code: ERROR_CODES.INVALID_DATA,
      error_description: ERROR_MESSAGES.INVALID_DATA,
    });
  }

  const validMeasureTypes = ['WATER', 'GAS'];
  if (measure_type && !validMeasureTypes.includes(measure_type.toUpperCase())) {
    return res.status(STATUS_BAD_REQUEST).json({
      error_code: ERROR_CODES.INVALID_DATA,
      error_description: "Tipo de leitura inválido.",
    });
  }

  try {
    const measures = await getMeasures(customer_code, measure_type?.toUpperCase());

    if (measures.length === 0) {
      return res.status(STATUS_NOT_FOUND).json({
        error_code: ERROR_CODES.NOT_FOUND,
        error_description: ERROR_MESSAGES.NOT_FOUND,
      });
    }

    res.status(STATUS_OK).json({
      customer_code,
      measures,
    });
  } catch (error) {
    console.error("Erro ao recuperar as medidas:", error);
    res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      error_code: ERROR_CODES.INVALID_DATA,
      error_description: "Erro interno do servidor",
    });
  }
});

app.listen(PORT, () => {
  console.log("Server Listening on PORT:", PORT);
});
