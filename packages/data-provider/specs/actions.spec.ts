import axios from 'axios';
import { z } from 'zod';
import { OpenAPIV3 } from 'openapi-types';
import {
  createURL,
  resolveRef,
  ActionRequest,
  openapiToFunction,
  FunctionSignature,
  validateAndParseOpenAPISpec,
} from '../src/actions';
import {
  getWeatherOpenapiSpec,
  whimsicalOpenapiSpec,
  scholarAIOpenapiSpec,
  swapidev,
} from './openapiSpecs';
import { AuthorizationTypeEnum, AuthTypeEnum } from '../src/types/assistants';
import type { FlowchartSchema } from './openapiSpecs';
import type { ParametersSchema } from '../src/actions';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FunctionSignature', () => {
  it('creates a function signature and converts to JSON tool', () => {
    const signature = new FunctionSignature('testFunction', 'A test function', {
      param1: { type: 'string' },
    } as unknown as ParametersSchema);
    expect(signature.name).toBe('testFunction');
    expect(signature.description).toBe('A test function');
    expect(signature.toObjectTool()).toEqual({
      type: 'function',
      function: {
        name: 'testFunction',
        description: 'A test function',
        parameters: {
          param1: { type: 'string' },
        },
      },
    });
  });
});

describe('ActionRequest', () => {
  // Mocking responses for each method
  beforeEach(() => {
    mockedAxios.get.mockResolvedValue({ data: { success: true, method: 'GET' } });
    mockedAxios.post.mockResolvedValue({ data: { success: true, method: 'POST' } });
    mockedAxios.put.mockResolvedValue({ data: { success: true, method: 'PUT' } });
    mockedAxios.delete.mockResolvedValue({ data: { success: true, method: 'DELETE' } });
    mockedAxios.patch.mockResolvedValue({ data: { success: true, method: 'PATCH' } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should make a GET request', async () => {
    const actionRequest = new ActionRequest(
      'https://example.com',
      '/test',
      'GET',
      'testOp',
      false,
      'application/json',
    );
    await actionRequest.setParams({ param1: 'value1' });
    const response = await actionRequest.execute();
    expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com/test', expect.anything());
    expect(response.data).toEqual({ success: true, method: 'GET' });
  });

  describe('ActionRequest', () => {
    beforeEach(() => {
      mockedAxios.get.mockClear();
      mockedAxios.post.mockClear();
      mockedAxios.put.mockClear();
      mockedAxios.delete.mockClear();
      mockedAxios.patch.mockClear();
    });

    it('handles GET requests', async () => {
      mockedAxios.get.mockResolvedValue({ data: { success: true } });
      const actionRequest = new ActionRequest(
        'https://example.com',
        '/get',
        'GET',
        'testGet',
        false,
        'application/json',
      );
      await actionRequest.setParams({ param: 'test' });
      const response = await actionRequest.execute();
      expect(mockedAxios.get).toHaveBeenCalled();
      expect(response.data.success).toBe(true);
    });

    it('handles POST requests', async () => {
      mockedAxios.post.mockResolvedValue({ data: { success: true } });
      const actionRequest = new ActionRequest(
        'https://example.com',
        '/post',
        'POST',
        'testPost',
        false,
        'application/json',
      );
      await actionRequest.setParams({ param: 'test' });
      const response = await actionRequest.execute();
      expect(mockedAxios.post).toHaveBeenCalled();
      expect(response.data.success).toBe(true);
    });

    it('handles PUT requests', async () => {
      mockedAxios.put.mockResolvedValue({ data: { success: true } });
      const actionRequest = new ActionRequest(
        'https://example.com',
        '/put',
        'PUT',
        'testPut',
        false,
        'application/json',
      );
      await actionRequest.setParams({ param: 'test' });
      const response = await actionRequest.execute();
      expect(mockedAxios.put).toHaveBeenCalled();
      expect(response.data.success).toBe(true);
    });

    it('handles DELETE requests', async () => {
      mockedAxios.delete.mockResolvedValue({ data: { success: true } });
      const actionRequest = new ActionRequest(
        'https://example.com',
        '/delete',
        'DELETE',
        'testDelete',
        false,
        'application/json',
      );
      await actionRequest.setParams({ param: 'test' });
      const response = await actionRequest.execute();
      expect(mockedAxios.delete).toHaveBeenCalled();
      expect(response.data.success).toBe(true);
    });

    it('handles PATCH requests', async () => {
      mockedAxios.patch.mockResolvedValue({ data: { success: true } });
      const actionRequest = new ActionRequest(
        'https://example.com',
        '/patch',
        'PATCH',
        'testPatch',
        false,
        'application/json',
      );
      await actionRequest.setParams({ param: 'test' });
      const response = await actionRequest.execute();
      expect(mockedAxios.patch).toHaveBeenCalled();
      expect(response.data.success).toBe(true);
    });

    it('throws an error for unsupported HTTP methods', async () => {
      const actionRequest = new ActionRequest(
        'https://example.com',
        '/invalid',
        'INVALID',
        'testInvalid',
        false,
        'application/json',
      );
      await expect(actionRequest.execute()).rejects.toThrow('Unsupported HTTP method: INVALID');
    });

    it('replaces path parameters with values from toolInput', async () => {
      const actionRequest = new ActionRequest(
        'https://example.com',
        '/stocks/{stocksTicker}/bars/{multiplier}',
        'GET',
        'getAggregateBars',
        false,
        'application/json',
      );

      await actionRequest.setParams({
        stocksTicker: 'AAPL',
        multiplier: 5,
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      expect(actionRequest.path).toBe('/stocks/AAPL/bars/5');
      expect(actionRequest.params).toEqual({
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      await actionRequest.execute();
      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com/stocks/AAPL/bars/5', {
        headers: expect.anything(),
        params: {
          startDate: '2023-01-01',
          endDate: '2023-12-31',
        },
      });
    });
  });

  it('throws an error for unsupported HTTP method', async () => {
    const actionRequest = new ActionRequest(
      'https://example.com',
      '/test',
      'INVALID',
      'testOp',
      false,
      'application/json',
    );
    await expect(actionRequest.execute()).rejects.toThrow('Unsupported HTTP method: INVALID');
  });
});

describe('Authentication Handling', () => {
  it('correctly sets Basic Auth header', async () => {
    const actionRequest = new ActionRequest(
      'https://example.com',
      '/test',
      'GET',
      'testOp',
      false,
      'application/json',
    );

    const api_key = 'user:pass';
    const encodedCredentials = Buffer.from('user:pass').toString('base64');

    actionRequest.setAuth({
      auth: {
        type: AuthTypeEnum.ServiceHttp,
        authorization_type: AuthorizationTypeEnum.Basic,
      },
      api_key,
    });

    await actionRequest.setParams({ param1: 'value1' });
    await actionRequest.execute();
    expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com/test', {
      headers: expect.objectContaining({
        Authorization: `Basic ${encodedCredentials}`,
      }),
      params: expect.anything(),
    });
  });

  it('correctly sets Bearer token', async () => {
    const actionRequest = new ActionRequest(
      'https://example.com',
      '/test',
      'GET',
      'testOp',
      false,
      'application/json',
    );
    actionRequest.setAuth({
      auth: {
        type: AuthTypeEnum.ServiceHttp,
        authorization_type: AuthorizationTypeEnum.Bearer,
      },
      api_key: 'token123',
    });
    await actionRequest.setParams({ param1: 'value1' });
    await actionRequest.execute();
    expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com/test', {
      headers: expect.objectContaining({
        Authorization: 'Bearer token123',
      }),
      params: expect.anything(),
    });
  });

  it('correctly sets API Key', async () => {
    const actionRequest = new ActionRequest(
      'https://example.com',
      '/test',
      'GET',
      'testOp',
      false,
      'application/json',
    );
    // Updated to match ActionMetadata structure
    actionRequest.setAuth({
      auth: {
        type: AuthTypeEnum.ServiceHttp, // Assuming this is a valid enum or value for your context
        authorization_type: AuthorizationTypeEnum.Custom, // Assuming Custom means using a custom header
        custom_auth_header: 'X-API-KEY',
      },
      api_key: 'abc123',
    });
    await actionRequest.setParams({ param1: 'value1' });
    await actionRequest.execute();
    expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com/test', {
      headers: expect.objectContaining({
        'X-API-KEY': 'abc123',
      }),
      params: expect.anything(),
    });
  });
});

describe('resolveRef', () => {
  it('correctly resolves $ref references in the OpenAPI spec', () => {
    const openapiSpec = whimsicalOpenapiSpec;
    const flowchartRequestRef = (
      openapiSpec.paths['/ai.chatgpt.render-flowchart']?.post
        ?.requestBody as OpenAPIV3.RequestBodyObject
    )?.content['application/json'].schema;
    expect(flowchartRequestRef).toBeDefined();
    const resolvedFlowchartRequest = resolveRef(
      flowchartRequestRef as OpenAPIV3.RequestBodyObject,
      openapiSpec.components,
    );

    expect(resolvedFlowchartRequest).toBeDefined();
    expect(resolvedFlowchartRequest.type).toBe('object');
    const properties = resolvedFlowchartRequest.properties as FlowchartSchema;
    expect(properties).toBeDefined();
    expect(properties.mermaid).toBeDefined();
    expect(properties.mermaid.type).toBe('string');
  });
});

describe('openapiToFunction', () => {
  it('converts OpenAPI spec to function signatures and request builders', () => {
    const { functionSignatures, requestBuilders } = openapiToFunction(getWeatherOpenapiSpec);
    expect(functionSignatures.length).toBe(1);
    expect(functionSignatures[0].name).toBe('GetCurrentWeather');

    const parameters = functionSignatures[0].parameters as ParametersSchema & {
      properties: {
        location: {
          type: 'string';
        };
        locations: {
          type: 'array';
          items: {
            type: 'object';
            properties: {
              city: {
                type: 'string';
              };
              state: {
                type: 'string';
              };
              countryCode: {
                type: 'string';
              };
              time: {
                type: 'string';
              };
            };
          };
        };
      };
    };

    expect(parameters).toBeDefined();
    expect(parameters.properties.locations).toBeDefined();
    expect(parameters.properties.locations.type).toBe('array');
    expect(parameters.properties.locations.items.type).toBe('object');

    expect(parameters.properties.locations.items.properties.city.type).toBe('string');
    expect(parameters.properties.locations.items.properties.state.type).toBe('string');
    expect(parameters.properties.locations.items.properties.countryCode.type).toBe('string');
    expect(parameters.properties.locations.items.properties.time.type).toBe('string');

    expect(requestBuilders).toHaveProperty('GetCurrentWeather');
    expect(requestBuilders.GetCurrentWeather).toBeInstanceOf(ActionRequest);
  });

  describe('openapiToFunction with $ref resolution', () => {
    it('correctly converts OpenAPI spec to function signatures and request builders, resolving $ref references', () => {
      const { functionSignatures, requestBuilders } = openapiToFunction(whimsicalOpenapiSpec);

      expect(functionSignatures.length).toBeGreaterThan(0);

      const postRenderFlowchartSignature = functionSignatures.find(
        (sig) => sig.name === 'postRenderFlowchart',
      );
      expect(postRenderFlowchartSignature).toBeDefined();
      expect(postRenderFlowchartSignature?.name).toBe('postRenderFlowchart');
      expect(postRenderFlowchartSignature?.parameters).toBeDefined();

      expect(requestBuilders).toHaveProperty('postRenderFlowchart');
      const postRenderFlowchartRequestBuilder = requestBuilders['postRenderFlowchart'];
      expect(postRenderFlowchartRequestBuilder).toBeDefined();
      expect(postRenderFlowchartRequestBuilder.method).toBe('post');
      expect(postRenderFlowchartRequestBuilder.path).toBe('/ai.chatgpt.render-flowchart');
    });
  });
});

const invalidServerURL = 'Could not find a valid URL in `servers`';

describe('validateAndParseOpenAPISpec', () => {
  it('validates a correct OpenAPI spec successfully', () => {
    const validSpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      servers: [{ url: 'https://test.api' }],
      paths: { '/test': {} },
      components: { schemas: {} },
    });

    const result = validateAndParseOpenAPISpec(validSpec);
    expect(result.status).toBe(true);
    expect(result.message).toBe('OpenAPI spec is valid.');
  });

  it('returns an error for spec with no servers', () => {
    const noServerSpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: { '/test': {} },
      components: { schemas: {} },
    });

    const result = validateAndParseOpenAPISpec(noServerSpec);
    expect(result.status).toBe(false);
    expect(result.message).toBe(invalidServerURL);
  });

  it('returns an error for spec with empty server URL', () => {
    const emptyURLSpec = `{
      "openapi": "3.1.0",
      "info": {
        "title": "Untitled",
        "description": "Your OpenAPI specification",
        "version": "v1.0.0"
      },
      "servers": [
        {
          "url": ""
        }
      ],
      "paths": {},
      "components": {
        "schemas": {}
      }
    }`;

    const result = validateAndParseOpenAPISpec(emptyURLSpec);
    expect(result.status).toBe(false);
    expect(result.message).toBe(invalidServerURL);
  });

  it('returns an error for spec with no paths', () => {
    const noPathsSpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      servers: [{ url: 'https://test.api' }],
      components: { schemas: {} },
    });

    const result = validateAndParseOpenAPISpec(noPathsSpec);
    expect(result.status).toBe(false);
    expect(result.message).toBe('No paths found in the OpenAPI spec.');
  });

  it('detects missing components in spec', () => {
    const missingComponentSpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      servers: [{ url: 'https://test.api' }],
      paths: {
        '/test': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/Missing' } },
                },
              },
            },
          },
        },
      },
    });

    const result = validateAndParseOpenAPISpec(missingComponentSpec);
    expect(result.status).toBe(true);
    expect(result.message).toContain('reference to unknown component Missing');
    expect(result.spec).toBeDefined();
  });

  it('handles invalid spec formats', () => {
    const invalidSpec = 'not a valid spec';

    const result = validateAndParseOpenAPISpec(invalidSpec);
    expect(result.status).toBe(false);
    expect(result.message).toBe(invalidServerURL);
  });

  it('handles YAML spec and correctly converts to Function Signatures', () => {
    const result = validateAndParseOpenAPISpec(scholarAIOpenapiSpec);
    expect(result.status).toBe(true);

    const spec = result.spec;
    expect(spec).toBeDefined();

    const { functionSignatures, requestBuilders } = openapiToFunction(spec as OpenAPIV3.Document);
    expect(functionSignatures.length).toBe(3);
    expect(requestBuilders).toHaveProperty('searchAbstracts');
    expect(requestBuilders).toHaveProperty('getFullText');
    expect(requestBuilders).toHaveProperty('saveCitation');
  });
});

describe('createURL', () => {
  it('correctly combines domain and path', () => {
    expect(createURL('https://example.com', '/api/v1/users')).toBe(
      'https://example.com/api/v1/users',
    );
  });

  it('handles domain with trailing slash', () => {
    expect(createURL('https://example.com/', '/api/v1/users')).toBe(
      'https://example.com/api/v1/users',
    );
  });

  it('handles path with leading slash', () => {
    expect(createURL('https://example.com', 'api/v1/users')).toBe(
      'https://example.com/api/v1/users',
    );
  });

  it('handles domain with trailing slash and path with leading slash', () => {
    expect(createURL('https://example.com/', '/api/v1/users')).toBe(
      'https://example.com/api/v1/users',
    );
  });

  it('handles domain without trailing slash and path without leading slash', () => {
    expect(createURL('https://example.com', 'api/v1/users')).toBe(
      'https://example.com/api/v1/users',
    );
  });

  it('handles empty path', () => {
    expect(createURL('https://example.com', '')).toBe('https://example.com/');
  });

  it('handles domain with subdirectory', () => {
    expect(createURL('https://example.com/subdirectory', '/api/v1/users')).toBe(
      'https://example.com/subdirectory/api/v1/users',
    );
  });

  describe('openapiToFunction zodSchemas', () => {
    describe('getWeatherOpenapiSpec', () => {
      const { zodSchemas } = openapiToFunction(getWeatherOpenapiSpec, true);

      it('generates correct Zod schema for GetCurrentWeather', () => {
        expect(zodSchemas).toBeDefined();
        expect(zodSchemas?.GetCurrentWeather).toBeDefined();

        const GetCurrentWeatherSchema = zodSchemas?.GetCurrentWeather;

        expect(GetCurrentWeatherSchema instanceof z.ZodObject).toBe(true);

        if (!(GetCurrentWeatherSchema instanceof z.ZodObject)) {
          throw new Error('GetCurrentWeatherSchema is not a ZodObject');
        }

        const shape = GetCurrentWeatherSchema.shape;
        expect(shape.location instanceof z.ZodString).toBe(true);

        // Check locations property
        expect(shape.locations).toBeDefined();
        expect(shape.locations instanceof z.ZodOptional).toBe(true);

        if (!(shape.locations instanceof z.ZodOptional)) {
          throw new Error('locations is not a ZodOptional');
        }

        const locationsInnerType = shape.locations._def.innerType;
        expect(locationsInnerType instanceof z.ZodArray).toBe(true);

        if (!(locationsInnerType instanceof z.ZodArray)) {
          throw new Error('locationsInnerType is not a ZodArray');
        }

        const locationsItemSchema = locationsInnerType.element;
        expect(locationsItemSchema instanceof z.ZodObject).toBe(true);

        if (!(locationsItemSchema instanceof z.ZodObject)) {
          throw new Error('locationsItemSchema is not a ZodObject');
        }

        // Validate the structure of locationsItemSchema
        expect(locationsItemSchema.shape.city instanceof z.ZodString).toBe(true);
        expect(locationsItemSchema.shape.state instanceof z.ZodString).toBe(true);
        expect(locationsItemSchema.shape.countryCode instanceof z.ZodString).toBe(true);

        // Check if time is optional
        const timeSchema = locationsItemSchema.shape.time;
        expect(timeSchema instanceof z.ZodOptional).toBe(true);

        if (!(timeSchema instanceof z.ZodOptional)) {
          throw new Error('timeSchema is not a ZodOptional');
        }

        expect(timeSchema._def.innerType instanceof z.ZodString).toBe(true);

        // Check the description
        expect(shape.locations._def.description).toBe(
          'A list of locations to retrieve the weather for.',
        );
      });

      it('validates correct data for GetCurrentWeather', () => {
        const GetCurrentWeatherSchema = zodSchemas?.GetCurrentWeather as z.ZodTypeAny;
        const validData = {
          location: 'New York',
          locations: [
            { city: 'New York', state: 'NY', countryCode: 'US', time: '2023-12-04T14:00:00Z' },
          ],
        };
        expect(() => GetCurrentWeatherSchema.parse(validData)).not.toThrow();
      });

      it('throws error for invalid data for GetCurrentWeather', () => {
        const GetCurrentWeatherSchema = zodSchemas?.GetCurrentWeather as z.ZodTypeAny;
        const invalidData = {
          location: 123,
          locations: [{ city: 'New York', state: 'NY', countryCode: 'US', time: 'invalid-time' }],
        };
        expect(() => GetCurrentWeatherSchema.parse(invalidData)).toThrow();
      });
    });

    describe('whimsicalOpenapiSpec', () => {
      const { zodSchemas } = openapiToFunction(whimsicalOpenapiSpec, true);

      it('generates correct Zod schema for postRenderFlowchart', () => {
        expect(zodSchemas).toBeDefined();
        expect(zodSchemas?.postRenderFlowchart).toBeDefined();

        const PostRenderFlowchartSchema = zodSchemas?.postRenderFlowchart;
        expect(PostRenderFlowchartSchema).toBeInstanceOf(z.ZodObject);

        if (!(PostRenderFlowchartSchema instanceof z.ZodObject)) {
          return;
        }

        const shape = PostRenderFlowchartSchema.shape;
        expect(shape.mermaid).toBeInstanceOf(z.ZodString);
        expect(shape.title).toBeInstanceOf(z.ZodOptional);
        expect((shape.title as z.ZodOptional<z.ZodString>)._def.innerType).toBeInstanceOf(
          z.ZodString,
        );
      });

      it('validates correct data for postRenderFlowchart', () => {
        const PostRenderFlowchartSchema = zodSchemas?.postRenderFlowchart;
        const validData = {
          mermaid: 'graph TD; A-->B; B-->C; C-->D;',
          title: 'Test Flowchart',
        };
        expect(() => PostRenderFlowchartSchema?.parse(validData)).not.toThrow();
      });

      it('throws error for invalid data for postRenderFlowchart', () => {
        const PostRenderFlowchartSchema = zodSchemas?.postRenderFlowchart;
        const invalidData = {
          mermaid: 123,
          title: 42,
        };
        expect(() => PostRenderFlowchartSchema?.parse(invalidData)).toThrow();
      });
    });

    describe('scholarAIOpenapiSpec', () => {
      const result = validateAndParseOpenAPISpec(scholarAIOpenapiSpec);
      const spec = result.spec as OpenAPIV3.Document;
      const { zodSchemas } = openapiToFunction(spec, true);

      it('generates correct Zod schema for searchAbstracts', () => {
        expect(zodSchemas).toBeDefined();
        expect(zodSchemas?.searchAbstracts).toBeDefined();

        const SearchAbstractsSchema = zodSchemas?.searchAbstracts;
        expect(SearchAbstractsSchema).toBeInstanceOf(z.ZodObject);

        if (!(SearchAbstractsSchema instanceof z.ZodObject)) {
          return;
        }

        const shape = SearchAbstractsSchema.shape;
        expect(shape.keywords).toBeInstanceOf(z.ZodString);
        expect(shape.sort).toBeInstanceOf(z.ZodOptional);
        expect(
          (shape.sort as z.ZodOptional<z.ZodEnum<[string, ...string[]]>>)._def.innerType,
        ).toBeInstanceOf(z.ZodEnum);
        expect(shape.query).toBeInstanceOf(z.ZodString);
        expect(shape.peer_reviewed_only).toBeInstanceOf(z.ZodOptional);
        expect(shape.start_year).toBeInstanceOf(z.ZodOptional);
        expect(shape.end_year).toBeInstanceOf(z.ZodOptional);
        expect(shape.offset).toBeInstanceOf(z.ZodOptional);
      });

      it('validates correct data for searchAbstracts', () => {
        const SearchAbstractsSchema = zodSchemas?.searchAbstracts;
        const validData = {
          keywords: 'machine learning',
          sort: 'cited_by_count',
          query: 'AI applications',
          peer_reviewed_only: 'true',
          start_year: '2020',
          end_year: '2023',
          offset: '0',
        };
        expect(() => SearchAbstractsSchema?.parse(validData)).not.toThrow();
      });

      it('throws error for invalid data for searchAbstracts', () => {
        const SearchAbstractsSchema = zodSchemas?.searchAbstracts;
        const invalidData = {
          keywords: 123,
          sort: 'invalid_sort',
          query: 42,
          peer_reviewed_only: 'maybe',
          start_year: 2020,
          end_year: 2023,
          offset: 0,
        };
        expect(() => SearchAbstractsSchema?.parse(invalidData)).toThrow();
      });

      it('generates correct Zod schema for getFullText', () => {
        expect(zodSchemas?.getFullText).toBeDefined();

        const GetFullTextSchema = zodSchemas?.getFullText;
        expect(GetFullTextSchema).toBeInstanceOf(z.ZodObject);

        if (!(GetFullTextSchema instanceof z.ZodObject)) {
          return;
        }

        const shape = GetFullTextSchema.shape;
        expect(shape.pdf_url).toBeInstanceOf(z.ZodString);
        expect(shape.chunk).toBeInstanceOf(z.ZodOptional);
        expect((shape.chunk as z.ZodOptional<z.ZodNumber>)._def.innerType).toBeInstanceOf(
          z.ZodNumber,
        );
      });

      it('generates correct Zod schema for saveCitation', () => {
        expect(zodSchemas?.saveCitation).toBeDefined();

        const SaveCitationSchema = zodSchemas?.saveCitation;
        expect(SaveCitationSchema).toBeInstanceOf(z.ZodObject);

        if (!(SaveCitationSchema instanceof z.ZodObject)) {
          return;
        }

        const shape = SaveCitationSchema.shape;
        expect(shape.doi).toBeInstanceOf(z.ZodString);
        expect(shape.zotero_user_id).toBeInstanceOf(z.ZodString);
        expect(shape.zotero_api_key).toBeInstanceOf(z.ZodString);
      });
    });
  });

  describe('openapiToFunction zodSchemas for SWAPI', () => {
    const result = validateAndParseOpenAPISpec(swapidev);
    const spec = result.spec as OpenAPIV3.Document;
    const { zodSchemas } = openapiToFunction(spec, true);

    describe('getPeople schema', () => {
      it('does not generate Zod schema for getPeople (no parameters)', () => {
        expect(zodSchemas).toBeDefined();
        expect(zodSchemas?.getPeople).toBeUndefined();
      });

      it('validates correct data for getPeople', () => {
        const GetPeopleSchema = zodSchemas?.getPeople;
        expect(GetPeopleSchema).toBeUndefined();
      });

      it('does not throw for invalid data for getPeople', () => {
        const GetPeopleSchema = zodSchemas?.getPeople;
        expect(GetPeopleSchema).toBeUndefined();
      });
    });

    describe('getPersonById schema', () => {
      it('generates correct Zod schema for getPersonById', () => {
        expect(zodSchemas).toBeDefined();
        expect(zodSchemas?.getPersonById).toBeDefined();

        const GetPersonByIdSchema = zodSchemas?.getPersonById;
        expect(GetPersonByIdSchema).toBeInstanceOf(z.ZodObject);

        if (!(GetPersonByIdSchema instanceof z.ZodObject)) {
          return;
        }

        const shape = GetPersonByIdSchema.shape;
        expect(shape.id).toBeInstanceOf(z.ZodString);
      });

      it('validates correct data for getPersonById', () => {
        const GetPersonByIdSchema = zodSchemas?.getPersonById;
        const validData = { id: '1' };
        expect(() => GetPersonByIdSchema?.parse(validData)).not.toThrow();
      });

      it('throws error for invalid data for getPersonById', () => {
        const GetPersonByIdSchema = zodSchemas?.getPersonById;
        const invalidData = { id: 1 }; // should be string
        expect(() => GetPersonByIdSchema?.parse(invalidData)).toThrow();
      });
    });
  });
});