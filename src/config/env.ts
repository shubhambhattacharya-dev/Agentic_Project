import "dotenv/config"
import {z} from 'zod'



const envSchema=z.object({
    GROQ_API:z.string().min(1,"Groq API key missing in .env!"),
    PORT:z.coerce.number().default(5000),
    GROQ_MODEL_LLM:z.string().default("llama-3.3-70b-versatile"),
    GROQ_MODEL_SLM:z.string().default("llama-3.3-8b-instant "),
    NODE_ENV:z.enum(["development" ,"production","test"]).default("development"),
    ALLOWED_ORIGINS:z.string().default("*"),

})

const parsed=envSchema.safeParse(process.env);

if(!parsed.success){
    console.error("Environment validation failed !! checl your .env file");
    console.error(parsed.error.format());
    process.exit(1);

}

export const env=parsed.data;